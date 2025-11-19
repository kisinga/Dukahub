import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Audit Trail Filter Component
 * 
 * Search and filter audit logs by event type, entity type, source, and general search
 */
@Component({
    selector: 'app-audit-trail-filter',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div class="flex-1">
                <input
                    type="text"
                    placeholder="Search by event type, entity type, or user ID..."
                    class="input input-bordered w-full input-sm sm:input-md"
                    [value]="searchQuery()"
                    (input)="onSearchChange($event)"
                />
            </div>
            <div class="flex gap-2 flex-wrap">
                <select
                    class="select select-bordered select-sm sm:select-md flex-1 sm:flex-none sm:w-auto min-w-[150px]"
                    [value]="eventTypeFilter()"
                    (change)="onEventTypeFilterChange($event)"
                >
                    <option value="">All Event Types</option>
                    @for (eventType of eventTypes(); track eventType) {
                        <option [value]="eventType">{{ eventType }}</option>
                    }
                </select>
                <select
                    class="select select-bordered select-sm sm:select-md flex-1 sm:flex-none sm:w-auto min-w-[150px]"
                    [value]="entityTypeFilter()"
                    (change)="onEntityTypeFilterChange($event)"
                >
                    <option value="">All Entity Types</option>
                    @for (entityType of entityTypes(); track entityType) {
                        <option [value]="entityType">{{ entityType }}</option>
                    }
                </select>
                <select
                    class="select select-bordered select-sm sm:select-md flex-1 sm:flex-none sm:w-auto min-w-[140px]"
                    [value]="sourceFilter()"
                    (change)="onSourceFilterChange($event)"
                >
                    <option value="">All Sources</option>
                    <option value="user_action">User Action</option>
                    <option value="system_event">System Event</option>
                </select>
            </div>
        </div>
    `,
})
export class AuditTrailFilterComponent {
    readonly searchQuery = model<string>('');
    readonly eventTypeFilter = model<string>('');
    readonly entityTypeFilter = model<string>('');
    readonly sourceFilter = model<string>('');
    
    readonly eventTypes = input<string[]>([]);
    readonly entityTypes = input<string[]>([]);

    onSearchChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.searchQuery.set(target.value);
    }

    onEventTypeFilterChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        this.eventTypeFilter.set(target.value);
    }

    onEntityTypeFilterChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        this.entityTypeFilter.set(target.value);
    }

    onSourceFilterChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        this.sourceFilter.set(target.value);
    }
}









