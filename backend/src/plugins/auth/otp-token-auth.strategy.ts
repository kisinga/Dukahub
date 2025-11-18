import { Injectable } from '@nestjs/common';
import { SpanStatusCode, metrics, trace } from '@opentelemetry/api';
import {
    AuthenticationStrategy,
    Injector,
    NativeAuthenticationStrategy,
    RequestContext,
    User,
    UserService,
} from '@vendure/core';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { OtpService } from '../../services/auth/otp.service';

/**
 * Custom authentication strategy that validates OTP session tokens
 * If password looks like an OTP token (starts with "otp_session_"), validate it from Redis
 * Otherwise, fall back to native authentication
 */
@Injectable()
export class OtpTokenAuthStrategy implements AuthenticationStrategy<{ username: string; password: string }> {
    name = 'native';

    private readonly tracer = trace.getTracer('dukahub-auth');
    private readonly meter = metrics.getMeter('dukahub-auth');
    private readonly authAttemptsCounter = this.meter.createCounter('auth.admin.attempts', {
        description: 'Total number of admin authentication attempts',
    });
    private readonly authSuccessCounter = this.meter.createCounter('auth.admin.success', {
        description: 'Total number of successful admin authentications',
    });
    private readonly authFailureCounter = this.meter.createCounter('auth.admin.failure', {
        description: 'Total number of failed admin authentications',
    });

    private nativeStrategy?: NativeAuthenticationStrategy;
    private userService?: UserService;
    private otpService?: OtpService;

    constructor(
        private readonly otpServiceInject?: OtpService,
    ) {
        // OtpService will be injected via DI if provided, otherwise we'll get it later via init()
        if (otpServiceInject) {
            this.otpService = otpServiceInject;
        }
    }

    init(injector: Injector): void {
        try {
            this.nativeStrategy = injector.get(NativeAuthenticationStrategy);
            const maybeInit = (this.nativeStrategy as any)?.init;
            if (typeof maybeInit === 'function') {
                maybeInit.call(this.nativeStrategy, injector);
            }
        } catch (error: any) {
            // If native strategy cannot be resolved, non-OTP logins will fail fast in authenticate().
        }

        // Resolve supporting services used for OTP logins
        try {
            this.userService = injector.get(UserService);
        } catch (error: any) {
            // UserService is only required for OTP logins; failures will be reflected in spans.
        }

        // Get OtpService from DI container if not already set
        try {
            if (!this.otpService) {
                this.otpService = injector.get(OtpService);
            }
        } catch (error: any) {
            // OTP logins require OtpService.redis; failures will be reflected in spans.
        }
    }

    defineInputType(): DocumentNode {
        return gql`
            input NativeAuthInput {
                username: String!
                password: String!
            }
        `;
    }

    async authenticate(
        ctx: RequestContext,
        data: { username: string; password: string }
    ): Promise<User | false> {
        const { username, password } = data;
        const isOtpToken = !!password && password.startsWith('otp_session_');

        // Increment attempts metric
        this.authAttemptsCounter.add(1, {
            'auth.username': username,
            'auth.isOtpToken': isOtpToken,
        });

        const span = this.tracer.startSpan('auth.admin.authenticate', {
            attributes: {
                'auth.username': username,
                'auth.isOtpToken': isOtpToken,
            },
        });

        try {
            // Non-OTP → delegate to native strategy
            if (!isOtpToken) {
                if (!this.nativeStrategy) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'native_strategy_unavailable',
                    });
                    span.setAttribute('auth.outcome', 'native_strategy_unavailable');
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'native_strategy_unavailable',
                    });
                    return false;
                }

                span.setAttribute('auth.path', 'native');
                const result = await this.nativeStrategy.authenticate(ctx, data);

                if (result) {
                    span.setStatus({ code: SpanStatusCode.OK });
                    span.setAttribute('auth.outcome', 'success');
                    this.authSuccessCounter.add(1, { 'auth.username': username });
                } else {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'native_auth_failed',
                    });
                    span.setAttribute('auth.outcome', 'native_auth_failed');
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'native_auth_failed',
                    });
                }

                return result;
            }

            // OTP path
            span.setAttribute('auth.path', 'otp');

            if (!this.otpService?.redis) {
                span.addEvent('otp.redis.unavailable');
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: 'otp_redis_unavailable',
                });
                span.setAttribute('auth.outcome', 'otp_redis_unavailable');
                this.authFailureCounter.add(1, {
                    'auth.username': username,
                    'auth.reason': 'otp_redis_unavailable',
                });
                return false;
            }

            const sessionKey = `otp:session:${password}`;
            const sessionData = await this.otpService.redis.get(sessionKey);

            if (!sessionData) {
                span.addEvent('otp.session.missing', { sessionKey });
                span.setAttribute('auth.outcome', 'otp_session_missing');
                // fall back to native if possible
                if (!this.nativeStrategy) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'otp_session_missing_and_native_unavailable',
                    });
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'otp_session_missing_and_native_unavailable',
                    });
                    return false;
                }
                const result = await this.nativeStrategy.authenticate(ctx, data);
                if (result) {
                    span.setStatus({ code: SpanStatusCode.OK });
                    span.setAttribute('auth.outcome', 'success_native_fallback');
                    this.authSuccessCounter.add(1, { 'auth.username': username });
                } else {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'native_auth_failed_after_otp_session_missing',
                    });
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'native_auth_failed_after_otp_session_missing',
                    });
                }
                return result;
            }

            const session = JSON.parse(sessionData);

            if (session.phoneNumber !== username || !session.userId) {
                span.addEvent('otp.session.mismatch', {
                    sessionPhone: session.phoneNumber,
                    sessionUserId: session.userId,
                });
                span.setAttribute('auth.outcome', 'otp_session_mismatch');
                if (!this.nativeStrategy) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'otp_session_mismatch_and_native_unavailable',
                    });
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'otp_session_mismatch_and_native_unavailable',
                    });
                    return false;
                }
                const result = await this.nativeStrategy.authenticate(ctx, data);
                if (result) {
                    span.setStatus({ code: SpanStatusCode.OK });
                    span.setAttribute('auth.outcome', 'success_native_fallback');
                    this.authSuccessCounter.add(1, { 'auth.username': username });
                } else {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'native_auth_failed_after_otp_session_mismatch',
                    });
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'native_auth_failed_after_otp_session_mismatch',
                    });
                }
                return result;
            }

            if (!this.userService) {
                span.addEvent('otp.user_service.unavailable');
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: 'user_service_unavailable',
                });
                span.setAttribute('auth.outcome', 'user_service_unavailable');
                this.authFailureCounter.add(1, {
                    'auth.username': username,
                    'auth.reason': 'user_service_unavailable',
                });
                return false;
            }

            const user = await this.userService.getUserByEmailAddress(ctx, username);

            if (!user || user.id.toString() !== session.userId) {
                span.addEvent('otp.user.missing_or_mismatch', {
                    sessionUserId: session.userId,
                    resolvedUserId: user?.id?.toString() ?? 'null',
                });
                span.setAttribute('auth.outcome', 'otp_user_mismatch');
                if (!this.nativeStrategy) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'otp_user_mismatch_and_native_unavailable',
                    });
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'otp_user_mismatch_and_native_unavailable',
                    });
                    return false;
                }
                const result = await this.nativeStrategy.authenticate(ctx, data);
                if (result) {
                    span.setStatus({ code: SpanStatusCode.OK });
                    span.setAttribute('auth.outcome', 'success_native_fallback');
                    this.authSuccessCounter.add(1, { 'auth.username': username });
                } else {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'native_auth_failed_after_otp_user_mismatch',
                    });
                    this.authFailureCounter.add(1, {
                        'auth.username': username,
                        'auth.reason': 'native_auth_failed_after_otp_user_mismatch',
                    });
                }
                return result;
            }

            // Token validated - delete it and return user
            if (this.otpService?.redis) {
                await this.otpService.redis.del(sessionKey);
            }

            span.addEvent('otp.session.success', {
                userId: user.id.toString(),
            });
            span.setStatus({ code: SpanStatusCode.OK });
            span.setAttribute('auth.outcome', 'success');
            this.authSuccessCounter.add(1, { 'auth.username': username });

            return user;
        } catch (error: any) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error),
            });
            span.setAttribute('auth.outcome', 'exception');
            this.authFailureCounter.add(1, {
                'auth.username': username,
                'auth.reason': 'exception',
            });

            if (!this.nativeStrategy) {
                return false;
            }

            // On exception, last resort is to try native auth
            const result = await this.nativeStrategy.authenticate(ctx, data);
            return result;
        } finally {
            span.end();
        }
    }
}

