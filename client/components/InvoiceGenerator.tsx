import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  FileText,
  DollarSign,
  Calendar,
  User,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import { formatCurrency } from '../lib/stripe'; // Assuming this helper exists or I'll implement a simple one

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceGeneratorProps {
  academyId: string;
  onClose: () => void;
  onSave?: (invoiceData: any) => void;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ academyId, onClose, onSave }) => {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [notes, setNotes] = useState('Thank you for your business!');
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Training Session', quantity: 1, unitPrice: 0, amount: 0 }
  ]);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const total = calculateTotal();

    // Add Logo or Header
    doc.setFontSize(22);
    doc.setTextColor(0, 53, 145); // Primary Blue
    doc.text('INVOICE', 105, 20, { align: 'center' });

    // Company Info (Placeholder - could be dynamic based on academy settings)
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Soccer Academy', 105, 26, { align: 'center' });

    // Invoice Details
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Right Side: Invoice Info
    doc.text(`Invoice #: ${invoiceNumber}`, 140, 40);
    doc.text(`Date: ${date}`, 140, 45);
    doc.text(`Due Date: ${dueDate}`, 140, 50);

    // Left Side: Bill To
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 40);
    doc.setFontSize(10);
    doc.text(clientName || 'Client Name', 20, 46);
    if (clientEmail) doc.text(clientEmail, 20, 51);
    
    // Address with word wrap
    const splitAddress = doc.splitTextToSize(clientAddress || '', 80);
    doc.text(splitAddress, 20, 56);

    // Items Table Header
    let yPos = 80;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, yPos);
    doc.text('Qty', 100, yPos);
    doc.text('Price', 125, yPos);
    doc.text('Amount', 160, yPos);

    // Items
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    items.forEach(item => {
      doc.text(item.description, 25, yPos);
      doc.text(item.quantity.toString(), 100, yPos);
      doc.text(formatCurrency(item.unitPrice), 125, yPos);
      doc.text(formatCurrency(item.amount), 160, yPos);
      yPos += 8;
    });

    // Total
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 125, yPos);
    doc.text(formatCurrency(total), 160, yPos);

    // Notes
    if (notes) {
      yPos += 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(notes, 170);
      doc.text(splitNotes, 20, yPos + 5);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });

    doc.save(`Invoice-${invoiceNumber}.pdf`);

    // Save invoice to database
    if (onSave) {
      onSave({
        academy_id: academyId,
        invoice_number: invoiceNumber,
        client_name: clientName,
        client_email: clientEmail,
        client_address: clientAddress,
        issue_date: date,
        due_date: dueDate,
        notes: notes,
        subtotal: total,
        total_amount: total,
        status: 'draft', // Saved invoices start as draft
        items: items
      });
    }
  };

  const _formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Override formatCurrency if imported one fails or use local
  const formatCurrency = (amount: number) => {
      try {
          return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
          }).format(amount);
      } catch (e) {
          return `$${amount.toFixed(2)}`;
      }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Create New Invoice</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Invoice Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Bill To</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter client name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Items</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-500">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Amount</div>
              </div>
              
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-6 flex gap-2">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>
          </div>

          {/* Footer & Totals */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-t pt-6">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Payment Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="w-full md:w-1/3 space-y-3">
              <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t">
                <span>Total Amount</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
              <button
                onClick={generatePDF}
                disabled={!clientName || calculateTotal() === 0}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-sm"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Invoice PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;
