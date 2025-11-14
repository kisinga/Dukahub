import { Injectable, inject } from '@angular/core';
import { CompanyService } from './company.service';
import {
    PrintTemplate,
    Receipt52mmTemplate,
    A4Template,
    OrderData
} from './print-templates';

/**
 * Print Service
 * 
 * Handles printing orders with different templates.
 * Composable and extensible - new templates can be easily added.
 */
@Injectable({
    providedIn: 'root',
})
export class PrintService {
    private readonly companyService = inject(CompanyService);

    // Available templates
    private readonly templates: Map<string, PrintTemplate> = new Map([
        ['receipt-52mm', new Receipt52mmTemplate()],
        ['a4', new A4Template()],
    ]);

    /**
     * Get all available templates
     */
    getAvailableTemplates(): Array<{ id: string; name: string; width: string }> {
        return Array.from(this.templates.entries()).map(([id, template]) => ({
            id,
            name: template.name,
            width: template.width,
        }));
    }

    /**
     * Get a template by ID
     */
    getTemplate(templateId: string): PrintTemplate | null {
        return this.templates.get(templateId) || null;
    }

    /**
     * Register a new template
     */
    registerTemplate(id: string, template: PrintTemplate): void {
        this.templates.set(id, template);
    }

    /**
     * Print an order with the specified template
     * @param order - Order data to print
     * @param templateId - Template ID (default: 'receipt-52mm')
     */
    async printOrder(order: OrderData, templateId: string = 'receipt-52mm'): Promise<void> {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error(`Template ${templateId} not found`);
            return;
        }

        // Get company logo if available
        const companyLogo = this.companyService.companyLogoAsset()?.preview || null;

        // Render the order HTML
        const html = template.render(order, companyLogo);

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            console.error('Failed to open print window. Please allow popups.');
            return;
        }

        // Write the HTML content
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Print Order ${order.code}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        color: #000;
                        background: #fff;
                    }
                    .hidden-print {
                        display: none;
                    }
                    ${template.getStyles()}
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `);

        printWindow.document.close();

        // Wait for content to load, then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                // Close window after printing (optional)
                // printWindow.close();
            }, 250);
        };
    }

    /**
     * Print order in current window (for print view route)
     * This method prepares the page for printing without opening a new window
     */
    preparePrintView(order: OrderData, templateId: string = 'receipt-52mm'): string {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error(`Template ${templateId} not found`);
            return '';
        }

        // Get company logo if available
        const companyLogo = this.companyService.companyLogoAsset()?.preview || null;

        // Render the order HTML
        return template.render(order, companyLogo);
    }

    /**
     * Get print styles for a template
     */
    getPrintStyles(templateId: string = 'receipt-52mm'): string {
        const template = this.getTemplate(templateId);
        if (!template) {
            return '';
        }
        return template.getStyles();
    }
}

