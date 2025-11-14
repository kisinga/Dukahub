import { Injectable, inject } from '@angular/core';
import { CompanyService } from './company.service';
import { PrintTemplate, OrderData, Receipt52mmTemplate, A4Template } from './print-templates';

/**
 * Print Service
 * 
 * Handles printing of orders using different templates.
 * Composable and extensible - new templates can be registered.
 */
@Injectable({
    providedIn: 'root',
})
export class PrintService {
    private readonly companyService = inject(CompanyService);

    // Available templates
    private readonly templates = new Map<string, PrintTemplate>([
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
     * Print an order using the specified template
     * @param order - Order data to print
     * @param templateId - Template ID to use (default: 'receipt-52mm')
     */
    async printOrder(order: OrderData, templateId: string = 'receipt-52mm'): Promise<void> {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error(`Template ${templateId} not found`);
            return;
        }

        // Get company logo if available
        const companyLogo = this.companyService.companyLogoAsset()?.preview || null;

        // Render the order
        const html = template.render(order, companyLogo);
        const styles = template.getStyles();

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            console.error('Failed to open print window');
            return;
        }

        // Write the HTML and styles
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Order ${order.code}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                    }
                    ${styles}
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-only {
                            display: block !important;
                        }
                    }
                    @media screen {
                        .print-template {
                            margin: 20px auto;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        }
                    }
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
}
