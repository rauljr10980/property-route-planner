import React from 'react';
import { X, MapPin, DollarSign, Home, FileText, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PropertyDetailProps {
  property: any;
  onClose: () => void;
}

export default function PropertyDetail({ property, onClose }: PropertyDetailProps) {
  const bexarData = property.bexarCountyData || {};
  const taxInfo = bexarData.taxInfo || property.taxInfo || {};
  const propertyValues = bexarData.propertyValues || property.propertyValues || {};
  const paymentHistory = bexarData.paymentHistory || property.paymentHistory || [];

  // Prepare payment history data for graph
  const chartData = paymentHistory.map((payment: any) => ({
    date: payment.date,
    amount: payment.amount,
    year: payment.years?.[0] || '',
    payer: payment.payer
  })).reverse(); // Reverse to show oldest to newest

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-indigo-600 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Property Details</h2>
            <p className="text-indigo-100 mt-1">
              {property.CAN || property.propertyId || 'N/A'}
              {property.CAD && <span className="ml-2">• CAD: {property.CAD}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Address Section */}
          {(bexarData.address || property.ADDRSTRING) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-800">Address Information</h3>
              </div>
              <div className="space-y-1 text-sm">
                {bexarData.address && (
                  <div>
                    <strong>Owner Address:</strong> {bexarData.address}
                  </div>
                )}
                {bexarData.propertySiteAddress && (
                  <div>
                    <strong>Property Site Address:</strong> {bexarData.propertySiteAddress}
                  </div>
                )}
                {!bexarData.address && property.ADDRSTRING && (
                  <div>
                    <strong>Address:</strong> {property.ADDRSTRING}
                  </div>
                )}
                {bexarData.legalDescription && (
                  <div>
                    <strong>Legal Description:</strong> {bexarData.legalDescription}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tax Information */}
          {taxInfo.totalAmountDue !== null && (
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">Tax Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {taxInfo.currentYearAmountDue !== null && (
                  <div>
                    <strong className="text-gray-700">2025 Year Amount Due:</strong>
                    <div className="text-red-700 font-semibold text-lg">
                      {formatCurrency(taxInfo.currentYearAmountDue)}
                    </div>
                  </div>
                )}
                {taxInfo.delinquentAfter && (
                  <div>
                    <strong className="text-gray-700">Delinquent After:</strong>
                    <div className="text-gray-800">{taxInfo.delinquentAfter}</div>
                  </div>
                )}
                {taxInfo.halfPaymentOption !== null && (
                  <div>
                    <strong className="text-gray-700">Half Payment Option:</strong>
                    <div className="text-gray-800">{formatCurrency(taxInfo.halfPaymentOption)}</div>
                    {taxInfo.halfPaymentDeadline && (
                      <div className="text-xs text-gray-600">Deadline: {taxInfo.halfPaymentDeadline}</div>
                    )}
                  </div>
                )}
                {taxInfo.priorYearsAmountDue !== null && (
                  <div>
                    <strong className="text-gray-700">Prior Year(s) Amount Due:</strong>
                    <div className="text-red-700 font-semibold">
                      {formatCurrency(taxInfo.priorYearsAmountDue)}
                    </div>
                  </div>
                )}
                {taxInfo.totalAmountDue !== null && (
                  <div className="col-span-2 border-t-2 border-red-300 pt-2">
                    <strong className="text-gray-700 text-base">Total Amount Due:</strong>
                    <div className="text-red-800 font-bold text-2xl">
                      {formatCurrency(taxInfo.totalAmountDue)}
                    </div>
                  </div>
                )}
                {taxInfo.lastPaymentAmount !== null && (
                  <div>
                    <strong className="text-gray-700">Last Payment:</strong>
                    <div className="text-gray-800">{formatCurrency(taxInfo.lastPaymentAmount)}</div>
                    {taxInfo.lastPaymentDate && (
                      <div className="text-xs text-gray-600">Date: {taxInfo.lastPaymentDate}</div>
                    )}
                  </div>
                )}
                {taxInfo.lastPayer && (
                  <div>
                    <strong className="text-gray-700">Last Payer:</strong>
                    <div className="text-gray-800">{taxInfo.lastPayer}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Property Values */}
          {propertyValues.totalMarketValue !== null && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800">Property Values</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {propertyValues.totalMarketValue !== null && (
                  <div>
                    <strong className="text-gray-700">Total Market Value:</strong>
                    <div className="text-blue-700 font-semibold text-lg">
                      {formatCurrency(propertyValues.totalMarketValue)}
                    </div>
                  </div>
                )}
                {propertyValues.landValue !== null && (
                  <div>
                    <strong className="text-gray-700">Land Value:</strong>
                    <div className="text-gray-800">{formatCurrency(propertyValues.landValue)}</div>
                  </div>
                )}
                {propertyValues.improvementValue !== null && (
                  <div>
                    <strong className="text-gray-700">Improvement Value:</strong>
                    <div className="text-gray-800">{formatCurrency(propertyValues.improvementValue)}</div>
                  </div>
                )}
                {propertyValues.cappedValue !== null && (
                  <div>
                    <strong className="text-gray-700">Capped Value:</strong>
                    <div className="text-gray-800">{formatCurrency(propertyValues.cappedValue)}</div>
                  </div>
                )}
                {propertyValues.agriculturalValue !== null && propertyValues.agriculturalValue > 0 && (
                  <div>
                    <strong className="text-gray-700">Agricultural Value:</strong>
                    <div className="text-gray-800">{formatCurrency(propertyValues.agriculturalValue)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exemptions & Jurisdictions */}
          {(bexarData.exemptions?.length > 0 || bexarData.jurisdictions?.length > 0) && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Exemptions & Jurisdictions</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {bexarData.exemptions?.length > 0 && (
                  <div>
                    <strong className="text-gray-700">Exemptions:</strong>
                    <div className="text-gray-800">{bexarData.exemptions.join(', ')}</div>
                  </div>
                )}
                {bexarData.jurisdictions?.length > 0 && (
                  <div>
                    <strong className="text-gray-700">Jurisdictions:</strong>
                    <div className="text-gray-800">{bexarData.jurisdictions.join(', ')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment History Graph */}
          {paymentHistory.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-800">Payment History</h3>
                <span className="text-sm text-gray-600">({paymentHistory.length} payments)</span>
              </div>
              
              {/* Line Graph */}
              <div className="bg-white p-4 rounded-lg mb-4" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Payment Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment History Table */}
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-purple-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Year(s)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Payer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentHistory.map((payment: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">{formatDate(payment.date)}</td>
                        <td className="px-3 py-2 text-gray-700">{payment.years?.join(', ') || 'N/A'}</td>
                        <td className="px-3 py-2 text-gray-900 font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{payment.payer || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Data Message */}
          {!bexarData.address && !taxInfo.totalAmountDue && paymentHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No detailed property information available.</p>
              <p className="text-sm mt-2">CAD data will be fetched automatically during file processing.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-100 p-4 rounded-b-lg flex justify-end gap-2">
          <a
            href={`https://bexar.acttax.com/act_webdev/bexar/index.jsp`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            View on Bexar County Website
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

