/**
 * PDF Service
 * Generates professional PDFs for quotes, invoices, and reports
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');

class PDFService {
  constructor() {
    this.companyInfo = {
      name: 'Foam Fighters Ltd',
      address: 'Your Company Address',
      phone: '0333 577 0132',
      email: 'info@foamfighters.co.uk',
      website: 'www.foamfighters.co.uk',
      registration: 'Company Registration: 16612986'
    };
  }

  /**
   * Generate quote PDF
   */
  async generateQuotePDF(quoteData) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();

      // Load fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Colors
      const darkBlue = rgb(0.17, 0.35, 0.63); // #2c5aa0
      const gray = rgb(0.4, 0.4, 0.4);
      const black = rgb(0, 0, 0);
      const lightGray = rgb(0.95, 0.95, 0.95);

      let currentY = height - 50;

      // Header
      page.drawText('FOAM FIGHTERS', {
        x: 50,
        y: currentY,
        size: 28,
        font: boldFont,
        color: darkBlue
      });

      page.drawText('Professional Spray Foam Removal', {
        x: 50,
        y: currentY - 25,
        size: 12,
        font: regularFont,
        color: gray
      });

      // Quote title
      page.drawText('QUOTATION', {
        x: 450,
        y: currentY,
        size: 24,
        font: boldFont,
        color: darkBlue
      });

      currentY -= 80;

      // Company info box
      this.drawInfoBox(page, 50, currentY, 200, 100, 'Company Information', [
        this.companyInfo.name,
        this.companyInfo.address,
        `Phone: ${this.companyInfo.phone}`,
        `Email: ${this.companyInfo.email}`,
        this.companyInfo.website
      ], regularFont, boldFont);

      // Customer info box
      this.drawInfoBox(page, 300, currentY, 245, 100, 'Customer Information', [
        quoteData.customerInfo.name,
        quoteData.propertyDetails.address,
        `Email: ${quoteData.customerInfo.email}`,
        quoteData.customerInfo.phone ? `Phone: ${quoteData.customerInfo.phone}` : ''
      ].filter(Boolean), regularFont, boldFont);

      currentY -= 120;

      // Quote details box
      const quoteDetails = [
        `Quote Number: ${quoteData.quoteNumber}`,
        `Date: ${quoteData.createdAt.toLocaleDateString('en-GB')}`,
        `Valid Until: ${quoteData.expiresAt.toLocaleDateString('en-GB')}`,
        `Property Type: ${quoteData.propertyDetails.propertyType}`,
        `Foam Type: ${quoteData.removalDetails.foamType}`,
        `Estimated Area: ${quoteData.removalDetails.estimatedArea} m²`
      ];

      this.drawInfoBox(page, 50, currentY, 495, 80, 'Quote Details', quoteDetails, regularFont, boldFont);

      currentY -= 100;

      // Services table
      currentY = this.drawServicesTable(page, currentY, quoteData, regularFont, boldFont);

      currentY -= 40;

      // Pricing breakdown
      currentY = this.drawPricingBreakdown(page, currentY, quoteData.calculations, regularFont, boldFont);

      currentY -= 40;

      // Terms and conditions
      if (quoteData.terms && quoteData.terms.length > 0) {
        currentY = this.drawTermsAndConditions(page, currentY, quoteData.terms, regularFont, boldFont);
      }

      // Footer
      this.drawFooter(page, regularFont, gray);

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      safeDebugLog('Quote PDF generated successfully', {
        quoteNumber: quoteData.quoteNumber,
        pageCount: pdfDoc.getPageCount(),
        sizeBytes: pdfBytes.length
      });

      return Buffer.from(pdfBytes);

    } catch (error) {
      safeDebugError('Error generating quote PDF', error);
      throw error;
    }
  }

  /**
   * Draw information box
   */
  drawInfoBox(page, x, y, width, height, title, items, regularFont, boldFont) {
    const lightGray = rgb(0.95, 0.95, 0.95);
    const black = rgb(0, 0, 0);
    const darkBlue = rgb(0.17, 0.35, 0.63);

    // Draw box border
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    });

    // Draw title background
    page.drawRectangle({
      x,
      y: y - 20,
      width,
      height: 20,
      color: lightGray
    });

    // Draw title
    page.drawText(title, {
      x: x + 10,
      y: y - 15,
      size: 12,
      font: boldFont,
      color: darkBlue
    });

    // Draw items
    let itemY = y - 35;
    for (const item of items) {
      if (item) {
        page.drawText(item, {
          x: x + 10,
          y: itemY,
          size: 10,
          font: regularFont,
          color: black
        });
        itemY -= 15;
      }
    }
  }

  /**
   * Draw services table
   */
  drawServicesTable(page, startY, quoteData, regularFont, boldFont) {
    const lightGray = rgb(0.95, 0.95, 0.95);
    const black = rgb(0, 0, 0);
    const darkBlue = rgb(0.17, 0.35, 0.63);

    let currentY = startY;

    // Table header
    page.drawText('SERVICES & DESCRIPTION', {
      x: 50,
      y: currentY,
      size: 14,
      font: boldFont,
      color: darkBlue
    });

    currentY -= 30;

    // Service items
    const services = [
      {
        description: `${quoteData.removalDetails.foamType} spray foam removal`,
        area: `${quoteData.removalDetails.estimatedArea} m²`,
        rate: `£${quoteData.calculations.baseRate}/m²`,
        amount: `£${quoteData.calculations.subtotal.toFixed(2)}`
      },
      {
        description: 'Waste disposal and site cleanup',
        area: `${quoteData.removalDetails.estimatedArea} m²`,
        rate: '£2.00/m²',
        amount: `£${quoteData.calculations.disposalFee.toFixed(2)}`
      },
      {
        description: 'Travel and logistics',
        area: '1',
        rate: 'Fixed',
        amount: `£${quoteData.calculations.travelCosts.toFixed(2)}`
      }
    ];

    // Table headers
    const tableY = currentY;
    page.drawRectangle({
      x: 50,
      y: tableY - 20,
      width: 495,
      height: 20,
      color: lightGray
    });

    const headers = [
      { text: 'Description', x: 60 },
      { text: 'Qty/Area', x: 280 },
      { text: 'Rate', x: 360 },
      { text: 'Amount', x: 450 }
    ];

    headers.forEach(header => {
      page.drawText(header.text, {
        x: header.x,
        y: tableY - 15,
        size: 10,
        font: boldFont,
        color: black
      });
    });

    currentY = tableY - 20;

    // Service rows
    services.forEach((service, index) => {
      const rowY = currentY - (index + 1) * 25;
      
      // Alternating row colors
      if (index % 2 === 1) {
        page.drawRectangle({
          x: 50,
          y: rowY - 20,
          width: 495,
          height: 20,
          color: rgb(0.98, 0.98, 0.98)
        });
      }

      page.drawText(service.description, {
        x: 60,
        y: rowY - 15,
        size: 9,
        font: regularFont,
        color: black
      });

      page.drawText(service.area, {
        x: 280,
        y: rowY - 15,
        size: 9,
        font: regularFont,
        color: black
      });

      page.drawText(service.rate, {
        x: 360,
        y: rowY - 15,
        size: 9,
        font: regularFont,
        color: black
      });

      page.drawText(service.amount, {
        x: 450,
        y: rowY - 15,
        size: 9,
        font: regularFont,
        color: black
      });
    });

    return currentY - (services.length * 25) - 10;
  }

  /**
   * Draw pricing breakdown
   */
  drawPricingBreakdown(page, startY, calculations, regularFont, boldFont) {
    const black = rgb(0, 0, 0);
    const darkBlue = rgb(0.17, 0.35, 0.63);

    let currentY = startY;

    // Pricing breakdown
    const pricing = [
      { label: 'Subtotal:', amount: `£${calculations.netAmount.toFixed(2)}`, bold: false },
      { label: 'VAT (20%):', amount: `£${calculations.vatAmount.toFixed(2)}`, bold: false },
      { label: 'TOTAL:', amount: `£${calculations.totalAmount.toFixed(2)}`, bold: true }
    ];

    pricing.forEach((item, index) => {
      const font = item.bold ? boldFont : regularFont;
      const color = item.bold ? darkBlue : black;
      const size = item.bold ? 14 : 12;

      page.drawText(item.label, {
        x: 350,
        y: currentY - (index * 25),
        size,
        font,
        color
      });

      page.drawText(item.amount, {
        x: 450,
        y: currentY - (index * 25),
        size,
        font,
        color
      });
    });

    return currentY - (pricing.length * 25) - 10;
  }

  /**
   * Draw terms and conditions
   */
  drawTermsAndConditions(page, startY, terms, regularFont, boldFont) {
    const black = rgb(0, 0, 0);
    const darkBlue = rgb(0.17, 0.35, 0.63);

    let currentY = startY;

    page.drawText('TERMS & CONDITIONS', {
      x: 50,
      y: currentY,
      size: 12,
      font: boldFont,
      color: darkBlue
    });

    currentY -= 20;

    terms.forEach((term, index) => {
      const bullet = `${index + 1}.`;
      
      page.drawText(bullet, {
        x: 50,
        y: currentY,
        size: 9,
        font: regularFont,
        color: black
      });

      // Wrap text if too long
      const maxWidth = 480;
      const wrappedText = this.wrapText(term, maxWidth, regularFont, 9);
      
      wrappedText.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: 70,
          y: currentY - (lineIndex * 12),
          size: 9,
          font: regularFont,
          color: black
        });
      });

      currentY -= (wrappedText.length * 12) + 5;
    });

    return currentY;
  }

  /**
   * Draw footer
   */
  drawFooter(page, regularFont, gray) {
    const footerY = 50;

    page.drawText(this.companyInfo.registration, {
      x: 50,
      y: footerY,
      size: 8,
      font: regularFont,
      color: gray
    });

    page.drawText(`Generated on ${new Date().toLocaleDateString('en-GB')}`, {
      x: 400,
      y: footerY,
      size: 8,
      font: regularFont,
      color: gray
    });
  }

  /**
   * Wrap text to fit within specified width
   */
  wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Generate invoice PDF (similar structure to quote)
   */
  async generateInvoicePDF(invoiceData) {
    // Similar to quote PDF but with invoice-specific content
    // Implementation would be similar to generateQuotePDF
    // with different title, payment terms, etc.
    
    try {
      safeDebugLog('Invoice PDF generation requested', {
        invoiceNumber: invoiceData.invoiceNumber
      });

      // For now, use quote PDF structure as template
      // In real implementation, this would have invoice-specific formatting
      return await this.generateQuotePDF(invoiceData);

    } catch (error) {
      safeDebugError('Error generating invoice PDF', error);
      throw error;
    }
  }

  /**
   * Generate project report PDF
   */
  async generateProjectReportPDF(projectData) {
    try {
      safeDebugLog('Project report PDF generation requested', {
        projectNumber: projectData.projectNumber
      });

      // Implementation would create a detailed project report
      // with milestones, progress photos, completion certificates, etc.
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText(`Project Report: ${projectData.projectNumber}`, {
        x: 50,
        y: 750,
        size: 20,
        font: regularFont
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);

    } catch (error) {
      safeDebugError('Error generating project report PDF', error);
      throw error;
    }
  }
}

// Create singleton instance
const pdfService = new PDFService();

module.exports = pdfService;