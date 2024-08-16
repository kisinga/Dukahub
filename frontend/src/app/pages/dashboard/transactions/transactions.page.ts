import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    template: `<p>transactions works!</p>`,
    styleUrl: './transactions.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage implements OnInit {

    ngOnInit(): void { }

}
