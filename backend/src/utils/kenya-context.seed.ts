import { INestApplicationContext } from '@nestjs/common';
import { CurrencyCode } from '@vendure/common/lib/generated-types';
import {
  Channel,
  ChannelService,
  CountryService,
  InitialData,
  LanguageCode,
  Logger,
  Populator,
  RequestContext,
  RequestContextService,
} from '@vendure/core';

const LOGGER_CTX = 'KenyaSeed';
const DEFAULT_KENYAN_ZONE_NAME = 'Kenya';
const DEFAULT_TAX_CATEGORY_NAME = 'Kenya VAT';
const DEFAULT_TAX_PERCENTAGE = 16;
const DEFAULT_CURRENCY_CODE = CurrencyCode.KES;

/**
 * Seeds the minimal Kenya context (country, zone, tax rate, and channel defaults)
 * using Vendure services rather than raw SQL.
 *
 * This mirrors Vendure's populate helper so we stay aligned with upstream schema changes.
 */
export async function ensureKenyaContext(app: INestApplicationContext): Promise<void> {
  // Allow operators to skip seeding explicitly
  if (process.env.AUTO_SEED_KENYA === 'false') {
    Logger.info('AUTO_SEED_KENYA=false detected. Skipping Kenya context seed.', LOGGER_CTX);
    return;
  }

  try {
    const requestContextService = app.get(RequestContextService);
    const channelService = app.get(ChannelService);
    const countryService = app.get(CountryService);
    const populator = app.get(Populator);

    const defaultChannel = await channelService.getDefaultChannel();
    const ctx = await buildAdminContext(requestContextService, defaultChannel);

    const kenyaExists = await countryService
      .findOneByCode(ctx, 'KE')
      .then(Boolean)
      .catch(() => false);

    if (kenyaExists) {
      Logger.info('Kenya already exists. Skipping Kenya context seed.', LOGGER_CTX);
      return;
    }

    Logger.info('Seeding Kenya context via Populator...', LOGGER_CTX);

    const initialData: InitialData = {
      defaultLanguage: LanguageCode.en,
      defaultZone: DEFAULT_KENYAN_ZONE_NAME,
      countries: [
        {
          name: 'Kenya',
          code: 'KE',
          zone: DEFAULT_KENYAN_ZONE_NAME,
        },
      ],
      taxRates: [
        {
          name: DEFAULT_TAX_CATEGORY_NAME,
          percentage: DEFAULT_TAX_PERCENTAGE,
        },
      ],
      shippingMethods: [],
      paymentMethods: [],
      collections: [],
      roles: [],
    };

    await populator.populateInitialData(initialData, defaultChannel);

    // Ensure currency defaults are aligned with Kenya context
    await channelService.update(RequestContext.empty(), {
      id: defaultChannel.id,
      currencyCode: DEFAULT_CURRENCY_CODE,
    });

    Logger.info('Kenya context seeded successfully.', LOGGER_CTX);
  } catch (error) {
    Logger.error(
      `Failed to seed Kenya context: ${error instanceof Error ? error.message : String(error)}`,
      LOGGER_CTX
    );
    throw error;
  }
}

async function buildAdminContext(
  requestContextService: RequestContextService,
  channel: Channel
): Promise<RequestContext> {
  return requestContextService.create({
    apiType: 'admin',
    languageCode: LanguageCode.en,
    channelOrToken: channel,
  });
}
