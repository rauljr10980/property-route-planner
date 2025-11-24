import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, TrendingUp, Download, Search, ExternalLink, Calendar, DollarSign, Users, FileText, RefreshCw, Loader, Home, Database, Map, Filter, TrendingDown, Minus, History, Trash2, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface FileHistoryEntry {
  id: string;
  filename: string;
  uploadDate: string;
  fileSize: number;
  rowCount: number;
  columns: string[];
  sampleRows: any[];
  fileData?: string;
}

export default function PropertyTaxTracker() {
  const [currentPage, setCurrentPage] = useState('home');
  const [uploads, setUploads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [fileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedFile, setSelectedFile] = useState<FileHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });
  const [trendFilter, setTrendFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 29.4241, lng: -98.4936 });
  const [mapZoom, setMapZoom] = useState(11);
  const [hoveredProperty, setHoveredProperty] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentPage === 'home' && properties.length > 0) {
      initializeMap();
    }
  }, [currentPage, properties]);

  const loadData = async () => {
    try {
      const uploadsData = await window.storage.get('uploads');
      const propertiesData = await window.storage.get('properties');
      const historyData = await window.storage.get('file-history');
      
      if (uploadsData) {
        setUploads(JSON.parse(uploadsData.value));
      }
      if (propertiesData) {
        setProperties(JSON.parse(propertiesData.value));
      }
      if (historyData) {
        setFileHistory(JSON.parse(historyData.value));
      }
    } catch (error) {
      console.log('No previous data found');
    }
    setLoading(false);
  };

  const saveData = async (newUploads, newProperties) => {
    try {
      await window.storage.set('uploads', JSON.stringify(newUploads));
      await window.storage.set('properties', JSON.stringify(newProperties));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const saveFileHistory = async (history: FileHistoryEntry[]) => {
    try {
      await window.storage.set('file-history', JSON.stringify(history));
      setFileHistory(history);
    } catch (error) {
      console.error('Error saving file history:', error);
      alert('Failed to save file history. Storage might be full.');
    }
  };

  const addToFileHistory = async (file: File, jsonData: any[], workbook: XLSX.WorkBook) => {
    try {
      const fileSize = file.size;
      const rowCount = jsonData.length;
      const columns = Object.keys(jsonData[0] || {});
      const sampleRows = jsonData.slice(0, 5);

      // Convert file to base64 for storage
      const fileData = await fileToBase64(file);

      const entry: FileHistoryEntry = {
        id: new Date().toISOString(),
        filename: file.name,
        uploadDate: new Date().toISOString(),
        fileSize,
        rowCount,
        columns,
        sampleRows,
        fileData
      };

      const updatedHistory = [entry, ...fileHistory];
      await saveFileHistory(updatedHistory);
    } catch (error) {
      console.error('Error adding to file history:', error);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const downloadFile = (entry: FileHistoryEntry) => {
    if (!entry.fileData) {
      alert('File data not available for download');
      return;
    }

    const link = document.createElement('a');
    link.href = entry.fileData;
    link.download = entry.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file from history?')) {
      return;
    }

    const updatedHistory = fileHistory.filter(entry => entry.id !== id);
    await saveFileHistory(updatedHistory);
  };

  const loadFileFromHistory = async (entry: FileHistoryEntry) => {
    if (!entry.fileData) {
      alert('File data not available');
      return;
    }

    try {
      // Convert base64 back to file
      const response = await fetch(entry.fileData);
      const blob = await response.blob();
      const file = new File([blob], entry.filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Create a fake event to reuse existing upload logic
      const fakeEvent = {
        target: {
          files: [file]
        }
      } as any;

      await handleFileUpload(fakeEvent);
      setCurrentPage('data');
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Failed to load file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFilteredFiles = () => {
    if (!searchTerm) return fileHistory;
    return fileHistory.filter(entry => 
      entry.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const initializeMap = () => {
    if (window.google && window.google.maps) {
      const mapElement = document.getElementById('propertyMap');
      if (!mapElement) return;

      const map = new window.google.maps.Map(mapElement, {
        center: mapCenter,
        zoom: mapZoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      properties.forEach(property => {
        const address = property.address || property.Address;
        if (!address) return;

        const coords = getCoordinatesFromAddress(address);
        if (!coords) return;

        const markerColor = getMarkerColor(property.motivationScore || 0);
        
        const marker = new window.google.maps.Marker({
          position: coords,
          map: map,
          title: `${property.owner || 'Unknown'} - Score: ${property.motivationScore || 0}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8
          }
        });

        marker.addListener('click', () => {
          setSelectedProperty(property);
        });

        marker.addListener('mouseover', () => {
          setHoveredProperty(property);
        });

        marker.addListener('mouseout', () => {
          setHoveredProperty(null);
        });
      });
    }
  };

  const getCoordinatesFromAddress = (address) => {
    const baseLatitude = 29.4241;
    const baseLongitude = -98.4936;
    return {
      lat: baseLatitude + (Math.random() - 0.5) * 0.1,
      lng: baseLongitude + (Math.random() - 0.5) * 0.1
    };
  };

  const getMarkerColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#3b82f6';
    return '#9ca3af';
  };

  const getFilteredProperties = () => {
    if (trendFilter === 'all') return properties;
    return properties.filter(p => p.balanceTrend === trendFilter);
  };

  const getAggregatedTrendData = () => {
    const filtered = getFilteredProperties();
    if (filtered.length === 0) return [];

    const yearlyTotals = {};
    
    filtered.forEach(property => {
      if (property.balanceHistory && property.balanceHistory.length > 0) {
        property.balanceHistory.forEach(entry => {
          if (!yearlyTotals[entry.year]) {
            yearlyTotals[entry.year] = { year: entry.year, total: 0, count: 0 };
          }
          yearlyTotals[entry.year].total += entry.amount;
          yearlyTotals[entry.year].count += 1;
        });
      }
    });

    return Object.values(yearlyTotals)
      .map(entry => ({
        year: entry.year,
        average: Math.round(entry.total / entry.count),
        total: Math.round(entry.total)
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  };

  const scrapeBexarCounty = async (accountNumber) => {
    try {
      const searchUrl = `https://bexar.acttax.com/act_webdev/bexar/index.jsp`;
      
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `account=${accountNumber}&search_type=account`
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property data');
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const paymentHistory = extractPaymentHistory(doc);
      const currentBalance = extractCurrentBalance(doc);
      const propertyDetails = extractPropertyDetails(doc);
      const metrics = calculateMetrics(paymentHistory, currentBalance);
      
      return {
        accountNumber,
        ...propertyDetails,
        currentBalance,
        paymentHistory,
        ...metrics,
        lastScraped: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error scraping account ${accountNumber}:`, error);
      return null;
    }
  };

  const extractPaymentHistory = (doc) => {
    const payments = [];
    const rows = doc.querySelectorAll('table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        const date = cells[0]?.textContent?.trim();
        const amount = cells[1]?.textContent?.trim();
        const paidBy = cells[2]?.textContent?.trim();
        
        if (date && amount && paidBy) {
          payments.push({
            date,
            amount: parseFloat(amount.replace(/[$,]/g, '')) || 0,
            paidBy
          });
        }
      }
    });
    
    return payments;
  };

  const extractCurrentBalance = (doc) => {
    const balanceElements = doc.querySelectorAll('td, div, span');
    for (let el of balanceElements) {
      const text = el.textContent?.trim() || '';
      if (text.includes('Total Due') || text.includes('Balance')) {
        const match = text.match(/\$[\d,]+\.?\d*/);
        if (match) {
          return parseFloat(match[0].replace(/[$,]/g, ''));
        }
      }
    }
    return 0;
  };

  const extractPropertyDetails = (doc) => {
    const details = {
      owner: '',
      address: '',
      propertyType: ''
    };
    
    const allText = doc.body.textContent || '';
    const ownerMatch = allText.match(/Owner[:\s]+([^\n]+)/i);
    if (ownerMatch) details.owner = ownerMatch[1].trim();
    
    const addressMatch = allText.match(/Address[:\s]+([^\n]+)/i);
    if (addressMatch) details.address = addressMatch[1].trim();
    
    return details;
  };

  const calculateMetrics = (paymentHistory, currentBalance) => {
    if (!paymentHistory || paymentHistory.length === 0) {
      return {
        monthsSinceLastPayment: 24,
        lastPaymentBy: 'Unknown',
        lastPaymentDate: null,
        balanceTrend: 'increasing',
        balanceHistory: [],
        paymentPattern: 'no-payments',
        paymentPlanActive: false
      };
    }

    const sortedPayments = [...paymentHistory].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    const lastPayment = sortedPayments[0];
    const lastPaymentDate = new Date(lastPayment.date);
    const today = new Date();
    const monthsDiff = Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24 * 30));

    let lastPaymentBy = 'Owner';
    const payerLower = lastPayment.paidBy.toLowerCase();
    
    if (payerLower.includes('mortgage') || payerLower.includes('bank') || 
        payerLower.includes('wells fargo') || payerLower.includes('chase') ||
        payerLower.includes('bofa') || payerLower.includes('citibank')) {
      lastPaymentBy = lastPayment.paidBy;
    } else if (payerLower.includes('title') || payerLower.includes('law') || 
               payerLower.includes('attorney') || payerLower.includes('legal')) {
      lastPaymentBy = lastPayment.paidBy;
    } else if (payerLower.includes('llc') || payerLower.includes('inc') || 
               payerLower.includes('investor')) {
      lastPaymentBy = lastPayment.paidBy;
    }

    const balanceHistory = calculateBalanceHistory(paymentHistory, currentBalance);
    const balanceTrend = determineBalanceTrend(balanceHistory);
    const paymentPattern = determinePaymentPattern(sortedPayments);
    const paymentPlanActive = checkPaymentPlan(sortedPayments);

    return {
      monthsSinceLastPayment: monthsDiff,
      lastPaymentBy,
      lastPaymentDate: lastPaymentDate.toISOString(),
      balanceTrend,
      balanceHistory,
      paymentPattern,
      paymentPlanActive
    };
  };

  const calculateBalanceHistory = (payments, currentBalance) => {
    const yearlyData = {};
    const currentYear = new Date().getFullYear();
    
    payments.forEach(payment => {
      const year = new Date(payment.date).getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = 0;
      }
      yearlyData[year] += payment.amount;
    });

    const history = [];
    let runningBalance = currentBalance;
    
    for (let year = currentYear; year >= currentYear - 5; year--) {
      history.unshift({
        year: year.toString(),
        amount: Math.round(runningBalance)
      });
      
      if (yearlyData[year - 1]) {
        runningBalance += yearlyData[year - 1];
      }
    }

    return history;
  };

  const determineBalanceTrend = (balanceHistory) => {
    if (balanceHistory.length < 2) return 'stable';
    
    const oldest = balanceHistory[0].amount;
    const newest = balanceHistory[balanceHistory.length - 1].amount;
    
    const change = ((newest - oldest) / oldest) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  };

  const determinePaymentPattern = (sortedPayments) => {
    if (sortedPayments.length === 0) return 'no-payments';
    if (sortedPayments.length === 1) return 'single-payment';
    
    const intervals = [];
    for (let i = 1; i < sortedPayments.length; i++) {
      const date1 = new Date(sortedPayments[i - 1].date);
      const date2 = new Date(sortedPayments[i].date);
      const daysDiff = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    if (avgInterval >= 25 && avgInterval <= 35) return 'monthly-plan';
    if (avgInterval < 60) return 'irregular';
    return 'sporadic';
  };

  const checkPaymentPlan = (sortedPayments) => {
    if (sortedPayments.length < 3) return false;
    
    const recentPayments = sortedPayments.filter(p => {
      const date = new Date(p.date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return date > sixMonthsAgo;
    });
    
    if (recentPayments.length < 3) return false;
    
    const amounts = recentPayments.map(p => p.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.every(amt => 
      Math.abs(amt - avgAmount) / avgAmount < 0.2
    );
    
    return variance;
  };

  const calculateMotivationScore = (property) => {
    let score = 0;
    const weights = {
      monthsSincePayment: 35,
      totalBalance: 25,
      balanceTrend: 20,
      lastPaymentBy: 15,
      paymentPlan: 5
    };

    const monthsSince = property.monthsSinceLastPayment || 0;
    if (monthsSince >= 24) score += weights.monthsSincePayment;
    else if (monthsSince >= 12) score += weights.monthsSincePayment * 0.8;
    else if (monthsSince >= 6) score += weights.monthsSincePayment * 0.5;
    else score += weights.monthsSincePayment * 0.2;

    const balance = parseFloat(property.currentBalance || property.totalOwed || property['Total Owed'] || property['Balance'] || 0);
    if (balance >= 10000) score += weights.totalBalance;
    else if (balance >= 5000) score += weights.totalBalance * 0.7;
    else if (balance >= 3000) score += weights.totalBalance * 0.4;
    else score += weights.totalBalance * 0.2;

    if (property.balanceTrend === 'increasing') score += weights.balanceTrend;
    else if (property.balanceTrend === 'stable') score += weights.balanceTrend * 0.5;
    else if (property.balanceTrend === 'decreasing') score += weights.balanceTrend * 0.2;

    const payer = String(property.lastPaymentBy || '').toLowerCase();
    if (payer.includes('mortgage') || payer.includes('bank') || payer.includes('wells fargo') || payer.includes('chase')) {
      score += weights.lastPaymentBy;
    } else if (payer.includes('title') || payer.includes('law') || payer.includes('attorney')) {
      score += weights.lastPaymentBy * 0.9;
    } else if (payer.includes('investor') || payer.includes('llc') || payer.includes('3rd party')) {
      score += weights.lastPaymentBy * 0.7;
    } else if (payer === 'owner') {
      score += weights.lastPaymentBy * 0.2;
    }

    if (property.paymentPlanActive === false || property.paymentPlanDefaulted === true) {
      score += weights.paymentPlan;
    }

    return Math.round(score);
  };

  const classifyPaymentBehavior = (property) => {
    const monthsSince = property.monthsSinceLastPayment || 0;
    const pattern = property.paymentPattern || '';

    if (monthsSince >= 24) return 'No payments in 24+ months';
    if (monthsSince >= 12) return 'No payments in 12+ months';
    if (pattern === 'monthly-plan') return 'Consistent monthly payments (payment plan)';
    if (pattern === 'irregular') return 'Irregular partial payments';
    if (pattern === 'single-payment') return 'Single lump-sum payment';
    if (pattern === 'sporadic') return 'Sporadic payment activity';
    return 'Normal payment activity';
  };

  const getMotivationLabel = (score) => {
    if (score >= 80) return { label: 'Very High', color: 'bg-red-100 text-red-800 border-red-300' };
    if (score >= 60) return { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    if (score >= 40) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (score >= 20) return { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    return { label: 'Very Low', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  };

  const generatePropertyInsight = (property) => {
    const score = calculateMotivationScore(property);
    const monthsSince = property.monthsSinceLastPayment || 0;
    const balance = parseFloat(property.currentBalance || 0);
    const payer = property.lastPaymentBy || 'owner';
    const trend = property.balanceTrend || 'stable';
    const behavior = classifyPaymentBehavior(property);

    let insight = `Delinquent for ${monthsSince} months. `;
    
    if (property.balanceHistory && property.balanceHistory.length >= 2) {
      const oldest = property.balanceHistory[0].amount;
      const newest = property.balanceHistory[property.balanceHistory.length - 1].amount;
      insight += `Balance ${trend === 'increasing' ? 'increased' : trend === 'decreasing' ? 'decreased' : 'remained stable'} from $${oldest.toLocaleString()} to $${newest.toLocaleString()} over last ${property.balanceHistory.length} years. `;
    } else {
      insight += `Current balance: $${balance.toLocaleString()}. `;
    }

    if (payer.toLowerCase() !== 'owner') {
      insight += `Last payment made by ${payer}, indicating potential ${payer.toLowerCase().includes('mortgage') ? 'mortgage default' : payer.toLowerCase().includes('title') || payer.toLowerCase().includes('law') ? 'probate/litigation' : 'third-party involvement'}. `;
    }

    insight += `Payment behavior: ${behavior}. `;
    insight += `Motivation Score: ${score}/100 (${getMotivationLabel(score).label.toLowerCase()}). `;

    if (score >= 70) {
      insight += '🔥 Recommend contacting ASAP.';
    } else if (score >= 50) {
      insight += '⚠️ Good prospect for outreach.';
    }

    return insight;
  };

  const enrichPropertiesWithBexarData = async (propertiesToEnrich) => {
    setEnriching(true);
    setEnrichmentProgress({ current: 0, total: propertiesToEnrich.length });

    const enrichedProperties = [];

    for (let i = 0; i < propertiesToEnrich.length; i++) {
      const prop = propertiesToEnrich[i];
      const accountNum = prop['Account Number'] || prop.accountNumber;

      setEnrichmentProgress({ current: i + 1, total: propertiesToEnrich.length });

      if (!accountNum) {
        enrichedProperties.push(prop);
        continue;
      }

      const bexarData = await scrapeBexarCounty(accountNum);

      if (bexarData) {
        const enriched = {
          ...prop,
          ...bexarData,
          motivationScore: 0,
          paymentBehavior: '',
          insight: ''
        };

        enriched.motivationScore = calculateMotivationScore(enriched);
        enriched.paymentBehavior = classifyPaymentBehavior(enriched);
        enriched.insight = generatePropertyInsight(enriched);

        enrichedProperties.push(enriched);
      } else {
        enrichedProperties.push(prop);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setEnriching(false);
    return enrichedProperties;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('No data found in the Excel file');
          return;
        }

        const hasAccountNumbers = jsonData.some(row => 
          row['Account Number'] || row.accountNumber || row['Account'] || row.account
        );

        if (!hasAccountNumbers) {
          alert('Excel file must contain an "Account Number" column');
          return;
        }

        // Add to file history
        await addToFileHistory(file, jsonData, workbook);

        const uploadDate = new Date().toISOString();
        const newUpload = {
          id: uploadDate,
          date: new Date(uploadDate).toLocaleDateString(),
          count: jsonData.length
        };

        const updatedUploads = [...uploads, newUpload];
        setUploads(updatedUploads);

        alert(`Starting to enrich ${jsonData.length} properties with Bexar County data. This may take a few minutes...`);
        
        const enrichedData = await enrichPropertiesWithBexarData(jsonData);
        
        const sortedProperties = enrichedData.sort((a, b) => b.motivationScore - a.motivationScore);
        setProperties(sortedProperties);
        
        await saveData(updatedUploads, sortedProperties);
        
        alert(`Successfully enriched ${enrichedData.length} properties!`);
        setCurrentPage('home');
      } catch (error) {
        console.error('Error:', error);
        alert('Error processing file. Please ensure it\'s a valid Excel file with an Account Number column.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const refreshProperty = async (property) => {
    const accountNum = property.accountNumber || property['Account Number'];
    if (!accountNum) {
      alert('No account number available');
      return;
    }

    setEnriching(true);
    const bexarData = await scrapeBexarCounty(accountNum);
    setEnriching(false);

    if (bexarData) {
      const enriched = {
        ...property,
        ...bexarData,
        motivationScore: 0,
        paymentBehavior: '',
        insight: ''
      };

      enriched.motivationScore = calculateMotivationScore(enriched);
      enriched.paymentBehavior = classifyPaymentBehavior(enriched);
      enriched.insight = generatePropertyInsight(enriched);

      const updatedProperties = properties.map(p => 
        (p.accountNumber || p['Account Number']) === accountNum ? enriched : p
      );
      setProperties(updatedProperties);
      setSelectedProperty(enriched);
      
      await saveData(uploads, updatedProperties);
      alert('Property data refreshed successfully!');
    } else {
      alert('Failed to fetch data from Bexar County');
    }
  };

  const openBexarCounty = (accountNumber) => {
    if (!accountNumber) {
      alert('No account number available for this property');
      return;
    }
    const url = `https://bexar.acttax.com/act_webdev/bexar/index.jsp`;
    window.open(url, '_blank');
  };

  const exportProperties = () => {
    if (properties.length === 0) {
      alert('No properties to export');
      return;
    }

    const exportData = properties.map(prop => ({
      'Account Number': prop.accountNumber || prop['Account Number'],
      'Motivation Score': prop.motivationScore,
      'Owner': prop.owner || prop.Owner || '',
      'Address': prop.address || prop.Address || '',
      'Current Balance': prop.currentBalance || '',
      'Months Since Payment': prop.monthsSinceLastPayment || '',
      'Last Payment By': prop.lastPaymentBy || '',
      'Balance Trend': prop.balanceTrend || '',
      'Payment Behavior': prop.paymentBehavior || '',
      'Payment Plan Active': prop.paymentPlanActive || '',
      'Status': getStatus(prop) || '',
      'Insight': prop.insight || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enriched Properties');
    XLSX.writeFile(wb, `enriched_properties_${new Date().toLocaleDateString()}.xlsx`);
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        await window.storage.delete('uploads');
        await window.storage.delete('properties');
        setUploads([]);
        setProperties([]);
        setSelectedProperty(null);
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  const getStatus = (property) => {
    const statusFields = ['Status', 'J', 'A', 'P', 'Judgment Status'];
    for (let field of statusFields) {
      if (property[field]) {
        const value = String(property[field]).toUpperCase();
        if (value === 'J' || value === 'A' || value === 'P') {
          return value;
        }
      }
    }
    
    for (let key in property) {
      const value = String(property[key]).toUpperCase();
      if (value === 'J' || value === 'A' || value === 'P') {
        return value;
      }
    }
    return null;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'J': return 'bg-red-100 text-red-800';
      case 'A': return 'bg-yellow-100 text-yellow-800';
      case 'P': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'J': return 'Judgment';
      case 'A': return 'Active';
      case 'P': return 'Pending';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-900">Property Tax Intel</h1>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentPage('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'home' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Home size={20} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('data')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'data' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Database size={20} />
                Manage Data
              </button>
              <button
                onClick={() => setCurrentPage('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'history' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <History size={20} />
                File History
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Home Page */}
      {currentPage === 'home' && (
        <div className="max-w-7xl mx-auto p-6">
          {properties.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Yet</h3>
              <p className="text-gray-600 mb-4">
                Upload property data to see your dashboard with maps and analytics
              </p>
              <button
                onClick={() => setCurrentPage('data')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go to Manage Data
              </button>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600 mb-1">Total Properties</div>
                  <div className="text-3xl font-bold text-gray-900">{properties.length}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <div className="text-sm text-gray-600 mb-1">High Priority (70+)</div>
                  <div className="text-3xl font-bold text-red-600">
                    {properties.filter(p => p.motivationScore >= 70).length}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <div className="text-sm text-gray-600 mb-1">Total Balance Owed</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${properties.reduce((sum, p) => sum + (parseFloat(p.currentBalance || 0)), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <div className="text-sm text-gray-600 mb-1">Avg Motivation Score</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(properties.reduce((sum, p) => sum + (p.motivationScore || 0), 0) / properties.length)}
                  </div>
                </div>
              </div>

              {/* Trend Filter and Graph */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Balance Trends Analysis</h2>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setTrendFilter('all')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Filter size={16} />
                      All
                    </button>
                    <button
                      onClick={() => setTrendFilter('increasing')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'increasing'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <TrendingUp size={16} />
                      Increasing
                    </button>
                    <button
                      onClick={() => setTrendFilter('stable')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'stable'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Minus size={16} />
                      Stable
                    </button>
                    <button
                      onClick={() => setTrendFilter('decreasing')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        trendFilter === 'decreasing'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <TrendingDown size={16} />
                      Decreasing
                    </button>
                  </div>
                </div>

                {getAggregatedTrendData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={getAggregatedTrendData()}>
                      <defs>
                        <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => `${value.toLocaleString()}`}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="average" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorAverage)"
                        name="Average Balance"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No trend data available for this filter
                  </div>
                )}
              </div>

              {/* Map Section */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Map className="text-green-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-900">Property Map</h2>
                  </div>
                  <div className="text-sm text-gray-600">
                    Click markers to view property details
                  </div>
                </div>

                {/* Map Legend */}
                <div className="mb-4 flex gap-4 items-center text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Very High (80+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>High (60-79)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Medium (40-59)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Low (20-39)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span>Very Low (0-19)</span>
                  </div>
                </div>

                {/* Google Maps Placeholder */}
                <div 
                  id="propertyMap" 
                  className="w-full h-96 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center"
                >
                  <div className="text-center">
                    <Map className="mx-auto mb-2 text-gray-400" size={48} />
                    <p className="text-gray-600">Map will display when Google Maps API is configured</p>
                    <p className="text-sm text-gray-500 mt-2">Properties shown as colored markers based on motivation score</p>
                  </div>
                </div>

                {/* Hovered Property Info */}
                {hoveredProperty && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {hoveredProperty.owner || 'Unknown Owner'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {hoveredProperty.address || 'No address'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-lg font-bold ${
                          getMotivationLabel(hoveredProperty.motivationScore || 0).color
                        }`}>
                          Score: {hoveredProperty.motivationScore || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          ${parseFloat(hoveredProperty.currentBalance || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Properties List */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Top 10 Priority Leads</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Owner</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Trend</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {properties.slice(0, 10).map((prop, idx) => {
                        const scoreData = getMotivationLabel(prop.motivationScore || 0);
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-900">#{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className={`px-3 py-1 text-sm font-bold rounded-lg border-2 inline-block ${scoreData.color}`}>
                                {prop.motivationScore || 0}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {prop.owner || prop.Owner || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {prop.address || prop.Address || 'No address'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              ${parseFloat(prop.currentBalance || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              {prop.balanceTrend === 'increasing' && (
                                <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                                  <TrendingUp size={14} /> Increasing
                                </span>
                              )}
                              {prop.balanceTrend === 'stable' && (
                                <span className="flex items-center gap-1 text-yellow-600 text-xs font-semibold">
                                  <Minus size={14} /> Stable
                                </span>
                              )}
                              {prop.balanceTrend === 'decreasing' && (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                                  <TrendingDown size={14} /> Decreasing
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedProperty(prop)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Data Management Page */}
      {currentPage === 'data' && (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Management</h2>
            
            {enriching && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader className="animate-spin text-blue-600" size={20} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-blue-900">
                      Enriching properties with Bexar County data...
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      Processing {enrichmentProgress.current} of {enrichmentProgress.total} properties
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((enrichmentProgress.current / enrichmentProgress.total) * 100)}%
                  </div>
                </div>
                <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 items-center flex-wrap mb-6">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload size={20} />
                Upload County Data (Excel)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={enriching}
                  className="hidden"
                />
              </label>

              {properties.length > 0 && (
                <>
                  <button
                    onClick={exportProperties}
                    disabled={enriching}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Download size={20} />
                    Export All Data
                  </button>
                  <button
                    onClick={clearAllData}
                    disabled={enriching}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Clear All Data
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-blue-600 font-semibold text-sm">Total Uploads</div>
                <div className="text-3xl font-bold text-blue-900">{uploads.length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-green-600 font-semibold text-sm">Total Properties</div>
                <div className="text-3xl font-bold text-green-900">{properties.length}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-red-600 font-semibold text-sm">High Motivation (70+)</div>
                <div className="text-3xl font-bold text-red-900">
                  {properties.filter(p => p.motivationScore >= 70).length}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-purple-600 font-semibold text-sm">Last Upload</div>
                <div className="text-lg font-bold text-purple-900">
                  {uploads.length > 0 ? uploads[uploads.length - 1].date : 'None'}
                </div>
              </div>
            </div>
          </div>

          {properties.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">All Properties</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Account #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Owner/Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Months</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Paid By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {properties.map((prop, idx) => {
                      const accountNum = prop.accountNumber || prop['Account Number'];
                      const owner = prop.owner || prop.Owner || 'Unknown';
                      const address = prop.address || prop.Address || '';
                      const balance = prop.currentBalance || prop.totalOwed || prop['Total Owed'] || prop.Balance || 0;
                      const months = prop.monthsSinceLastPayment || 0;
                      const paidBy = prop.lastPaymentBy || 'Unknown';
                      const status = getStatus(prop);
                      const scoreData = getMotivationLabel(prop.motivationScore || 0);

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className={`px-3 py-1 text-sm font-bold rounded-lg border-2 inline-block ${scoreData.color}`}>
                              {prop.motivationScore || 0}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                            {accountNum}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="font-semibold">{owner}</div>
                            <div className="text-xs text-gray-600">{address}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ${parseFloat(balance).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              months >= 24 ? 'bg-red-100 text-red-800' :
                              months >= 12 ? 'bg-orange-100 text-orange-800' :
                              months >= 6 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {months}m
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">
                            {paidBy}
                          </td>
                          <td className="px-4 py-3">
                            {status && (
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedProperty(prop)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => openBexarCounty(accountNum)}
                                className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                Bexar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Start</h3>
              <p className="text-gray-600 mb-4">
                Upload an Excel file with property Account Numbers to automatically scrape Bexar County data
              </p>
              <div className="text-sm text-gray-500 max-w-2xl mx-auto">
                <p className="mb-2">Your Excel file only needs one column:</p>
                <p className="font-mono text-xs bg-gray-100 p-2 rounded inline-block">Account Number</p>
                <p className="mt-3 text-xs">The system will automatically fetch all other data from Bexar County including payment history, balances, and who made payments.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File History Page */}
      {currentPage === 'history' && (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">File Upload History</h2>
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
                  <Upload size={20} />
                  Upload New File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-blue-600 font-semibold text-sm">Total Files</div>
                <div className="text-3xl font-bold text-blue-900">{fileHistory.length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-green-600 font-semibold text-sm">Total Rows</div>
                <div className="text-3xl font-bold text-green-900">
                  {fileHistory.reduce((sum, file) => sum + file.rowCount, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-purple-600 font-semibold text-sm">Total Storage</div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatFileSize(fileHistory.reduce((sum, file) => sum + file.fileSize, 0))}
                </div>
              </div>
            </div>
          </div>

          {/* File List */}
          {getFilteredFiles().length > 0 ? (
            <div className="space-y-4">
              {getFilteredFiles().map((file) => (
                <div key={file.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <FileText className="text-blue-600" size={32} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{file.filename}</h3>
                        <div className="flex gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(file.uploadDate).toLocaleString()}
                          </div>
                          <div>
                            {file.rowCount.toLocaleString()} properties
                          </div>
                          <div>
                            {formatFileSize(file.fileSize)}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {file.columns.slice(0, 5).map((col, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {col}
                            </span>
                          ))}
                          {file.columns.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{file.columns.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedFile(file)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <Eye size={16} />
                        Preview
                      </button>
                      <button
                        onClick={() => downloadFile(file)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Download size={16} />
                        Download
                      </button>
                      <button
                        onClick={() => loadFileFromHistory(file)}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                      >
                        <Upload size={16} />
                        Load
                      </button>
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <History className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? 'No files found' : 'No Upload History'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try a different search term' : 'Upload your first Excel file to see it here'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedFile.filename}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Uploaded: {new Date(selectedFile.uploadDate).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 font-semibold text-sm">Total Rows</div>
                  <div className="text-2xl font-bold text-blue-900">{selectedFile.rowCount.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 font-semibold text-sm">Columns</div>
                  <div className="text-2xl font-bold text-green-900">{selectedFile.columns.length}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 font-semibold text-sm">File Size</div>
                  <div className="text-2xl font-bold text-purple-900">{formatFileSize(selectedFile.fileSize)}</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Column Names</h4>
                <div className="flex gap-2 flex-wrap">
                  {selectedFile.columns.map((col, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg font-medium">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Sample Data (First 5 Rows)</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {selectedFile.columns.map((col, idx) => (
                          <th key={idx} className="px-4 py-2 text-left font-semibold text-gray-700 border-b">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFile.sampleRows.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          {selectedFile.columns.map((col, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 text-gray-900">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => downloadFile(selectedFile)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download size={18} />
                  Download File
                </button>
                <button
                  onClick={() => {
                    loadFileFromHistory(selectedFile);
                    setSelectedFile(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <Upload size={18} />
                  Load & Process
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Property Intelligence Report</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Account: {selectedProperty.accountNumber || selectedProperty['Account Number']}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Motivation Score</div>
                      <div className="text-4xl font-bold text-gray-900">{selectedProperty.motivationScore || 0}/100</div>
                      <div className="text-sm font-semibold text-blue-600 mt-1">
                        {getMotivationLabel(selectedProperty.motivationScore || 0).label} Priority
                      </div>
                    </div>
                    <div className="text-6xl">
                      {(selectedProperty.motivationScore || 0) >= 80 ? '🔥' : 
                       (selectedProperty.motivationScore || 0) >= 60 ? '⚠️' : 
                       (selectedProperty.motivationScore || 0) >= 40 ? '📊' : '📉'}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={18} className="text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Current Balance</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${parseFloat(selectedProperty.currentBalance || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={18} className="text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Months Delinquent</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedProperty.monthsSinceLastPayment || 0} months
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} className="text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Last Payment By</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedProperty.lastPaymentBy || 'Unknown'}
                  </div>
                  {selectedProperty.lastPaymentDate && (
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(selectedProperty.lastPaymentDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700">Payment Behavior</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedProperty.paymentBehavior || 'Normal'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Plan Active: {selectedProperty.paymentPlanActive ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              {selectedProperty.balanceHistory && selectedProperty.balanceHistory.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Balance Trend Over Time</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={selectedProperty.balanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Balance Owed"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {selectedProperty.paymentHistory && selectedProperty.paymentHistory.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Recent Payment History</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-600">
                        <tr>
                          <th className="text-left pb-2">Date</th>
                          <th className="text-left pb-2">Amount</th>
                          <th className="text-left pb-2">Paid By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedProperty.paymentHistory.slice(0, 10).map((payment, idx) => (
                          <tr key={idx}>
                            <td className="py-2">{payment.date}</td>
                            <td className="py-2 font-semibold">${payment.amount.toLocaleString()}</td>
                            <td className="py-2">{payment.paidBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-bold text-blue-900 mb-2">🤖 AI Intelligence Report</h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {selectedProperty.insight || generatePropertyInsight(selectedProperty)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => refreshProperty(selectedProperty)}
                  disabled={enriching}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <RefreshCw size={18} />
                  Refresh Data
                </button>
                <button
                  onClick={() => openBexarCounty(selectedProperty.accountNumber || selectedProperty['Account Number'])}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <ExternalLink size={18} />
                  View on Bexar County
                </button>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>

              {selectedProperty.lastScraped && (
                <div className="mt-4 text-xs text-center text-gray-500">
                  Last updated: {new Date(selectedProperty.lastScraped).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}