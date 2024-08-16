import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    standalone: true,
    imports: [NgClass],
    templateUrl: './open-close.page.html',
    styleUrl: './open-close.page.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenClosePage implements OnInit {
    steps = [
        { title: 'Personal Info', content: 'Enter your personal information' },
        { title: 'Contact Details', content: 'Provide your contact details' },
        { title: 'Preferences', content: 'Set your preferences' },
        { title: 'Review', content: 'Review your information' },
    ];

    activeStep = 0;

    handleNext() {
        this.activeStep = Math.min(this.activeStep + 1, this.steps.length - 1);
    }

    handleBack() {
        this.activeStep = Math.max(this.activeStep - 1, 0);
    }
    ngOnInit(): void { }

}
