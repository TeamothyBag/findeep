import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { PlusOutlined, FilterOutlined, CalendarOutlined, TagOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { VictoryPie, VictoryLine, VictoryChart, VictoryTheme, VictoryAxis } from 'victory';
import './TrackExpensesPage.css';

// IndexedDB Configuration
const DB_NAME = 'FinDeepDB';
const STORE_NAMES = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  BUDGET: 'budget'
};

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAMES.TRANSACTIONS)) {
        db.createObjectStore(STORE_NAMES.TRANSACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.CATEGORIES)) {
        db.createObjectStore(STORE_NAMES.CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.BUDGET)) {
        db.createObjectStore(STORE_NAMES.BUDGET, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// DB Operations
const transactionOperations = {
  getAll: async () => {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAMES.TRANSACTIONS, 'readonly');
      const store = tx.objectStore(STORE_NAMES.TRANSACTIONS);
      resolve(store.getAll());
    });
  },

  add: async (transaction) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.TRANSACTIONS, 'readwrite');
    tx.objectStore(STORE_NAMES.TRANSACTIONS).add({
      ...transaction,
      id: Date.now(),
      date: new Date().toISOString()
    });
    return tx.complete;
  },

  update: async (transaction) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.TRANSACTIONS, 'readwrite');
    tx.objectStore(STORE_NAMES.TRANSACTIONS).put(transaction);
    return tx.complete;
  },

  delete: async (id) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAMES.TRANSACTIONS, 'readwrite');
    tx.objectStore(STORE_NAMES.TRANSACTIONS).delete(id);
    return tx.complete;
  }
};

const getAllCategoriesFromDB = async () => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAMES.CATEGORIES, 'readonly');
    const request = tx.objectStore(STORE_NAMES.CATEGORIES).getAll();
    request.onsuccess = () => resolve(request.result);
  });
};

const getBudgetFromDB = async () => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAMES.BUDGET, 'readonly');
    const request = tx.objectStore(STORE_NAMES.BUDGET).get('current');
    request.onsuccess = () => resolve(request.result || { income: 0, payPeriod: 'monthly' });
  });
};

const TrackExpensesPage = () => {
  const theme = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budget, setBudget] = useState({ income: 0, payPeriod: 'monthly' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dateRange, setDateRange] = useState('month');
  const [editTransaction, setEditTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const dateRanges = ['Week', 'Month', 'Year', 'Custom'];

  // Chart data calculations
  const categorySpending = categories
    .filter(category => category?.name)
    .map(category => ({
      x: category.name || 'Uncategorized',
      y: transactions
        .filter(t => t.category === category.name)
        .reduce((sum, t) => sum + (Number(t.amount) || 0, 0))
    }))
    .filter(item => item.y > 0);

  
   // Fixed spending trend data
   const spendingTrend = transactions
   .sort((a, b) => {
     const dateA = new Date(a.date);
     const dateB = new Date(b.date);
     return dateA - dateB;
   })
   .map(t => {
     const date = new Date(t.date);
     return {
       x: date instanceof Date && !isNaN(date) ? date : new Date(),
       y: Number(t.amount) || 0
     };
   });// Filter invalid dates
   
  // Data loading
    // Improved data loading with error handling
    useEffect(() => {
      const loadData = async () => {
        try {
          const [txns, cats, budgetData] = await Promise.all([
            transactionOperations.getAll(),
            getAllCategoriesFromDB(),
            getBudgetFromDB()
          ]);
  
          // Ensure valid transaction dates
          const validatedTransactions = (txns || []).map(t => ({
            ...t,
            date: t.date || new Date().toISOString()
          }));
  
          setTransactions(validatedTransactions);
          setCategories(cats || []);
          setBudget(budgetData || { income: 0, payPeriod: 'monthly' });
        } catch (error) {
          console.error('Data loading error:', error);
        }
      };
  
      loadData();
    }, []);

  // Transaction operations
  const updateCategorySpending = (transaction, isDelete = false) => {
    setCategories(prev => prev.map(cat => {
      if (cat.name === transaction.category) {
        const spentChange = isDelete ? -transaction.amount : transaction.amount;
        return { ...cat, spent: cat.spent + spentChange };
      }
      return cat;
    }));
  };

  const handleAddTransaction = async (transaction) => {
    try {
      const validTransaction = {
        ...transaction,
        date: transaction.date || new Date().toISOString(),
        amount: Number(transaction.amount) || 0
      };

      await transactionOperations.add(validTransaction);
      setTransactions(prev => [...prev, validTransaction]);
      updateCategorySpending(validTransaction);
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleUpdateTransaction = async (updatedTx) => {
    const originalTx = transactions.find(t => t.id === updatedTx.id);
    
    if (originalTx) {
      if (originalTx.category !== updatedTx.category || originalTx.amount !== updatedTx.amount) {
        setCategories(prev => prev.map(cat => {
          if (cat.name === originalTx.category) {
            return { ...cat, spent: cat.spent - originalTx.amount };
          }
          if (cat.name === updatedTx.category) {
            return { ...cat, spent: cat.spent + updatedTx.amount };
          }
          return cat;
        }));
      }
    }

    try {
      await transactionOperations.update(updatedTx);
      setTransactions(prev => prev.map(tx => tx.id === updatedTx.id ? updatedTx : tx));
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDeleteTransaction = async (id) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (txToDelete) {
      try {
        await transactionOperations.delete(id);
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        updateCategorySpending(txToDelete, true);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  // Transaction filtering
  const filteredTransactions = transactions.filter(tx => {
    const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;
    const txDate = new Date(tx.date);
    const now = new Date();
    let startDate;

    switch(dateRange.toLowerCase()) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return matchesCategory;
    }
    
    return matchesCategory && txDate >= startDate;
  });

  
  return (
    <div className="expenses-page" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <header className="expenses-header" style={{ backgroundColor: theme.colors.primary }}>
        <div className="header-content">
          <h1 style={{ color: theme.colors.text.inverse }}>Track Expenses</h1>
          <div className="budget-summary" style={{ color: theme.colors.text.inverse }}>
            <span>Monthly Budget: {budget.income.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })}</span>
            <span>Remaining: {(budget.income - categories.reduce((sum, cat) => sum + cat.spent, 0)).toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })}</span>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="filters" style={{ backgroundColor: theme.colors.background }}>
        <div className="filter-group">
          <TagOutlined style={{ color: theme.colors.text.secondary }} />
          <select 
  value={selectedCategory}
  onChange={(e) => setSelectedCategory(e.target.value)}
  style={{ 
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    borderColor: theme.colors.neutrals.border
  }}
>
  <option value="All">All Categories</option>
  {categories.map(category => (
    <option key={category.id} value={category.name}>{category.name}</option>
  ))}
</select>
        </div>
        
        <div className="filter-group">
          <CalendarOutlined style={{ color: theme.colors.text.secondary }} />
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ 
              backgroundColor: theme.colors.background,
              color: theme.colors.text.primary,
              borderColor: theme.colors.neutrals.border
            }}
          >
            {dateRanges.map(range => (
              <option key={range} value={range.toLowerCase()}>{range}</option>
            ))}
          </select>
        </div>
      </div>



      {/* Visualizations */}
      <div className="charts-container">
        <div className="chart-card">
          <h3>Spending Breakdown</h3>
          {categorySpending.length > 0 ? (
          <VictoryPie
            data={categorySpending}
              colorScale={[theme.colors.secondary, theme.colors.accent, theme.colors.primary]}
              innerRadius={80}
              labelRadius={100}
              style={{
                labels: { 
                  fill: theme.colors.text.primary,
                  fontSize: theme.typography.sizes.small
                }
              }}
            />
          ) : (
            <div className="no-data">No spending data available</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Spending Trend</h3>
          {spendingTrend.length > 0 ? (
            <VictoryChart theme={VictoryTheme.material}>
              <VictoryLine
                data={spendingTrend}
                style={{
                  data: { stroke: theme.colors.primary },
                  parent: { border: `1px solid ${theme.colors.neutrals.border}` }
                }}
              />
            <VictoryAxis
              style={{
                axis: { stroke: theme.colors.neutrals.border },
                tickLabels: { fill: theme.colors.text.secondary }
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: theme.colors.neutrals.border },
                tickLabels: { fill: theme.colors.text.secondary }
              }}
            />
         </VictoryChart>
          ) : (
            <div className="no-data">No trend data available</div>
          )}
        </div>
      </div>

      
      {/* Transaction Modal */}
      {showModal && (
        <TransactionModal
          transaction={editTransaction}
          categories={categories}
          onSave={editTransaction ? handleUpdateTransaction : handleAddTransaction}
          onClose={() => {
            setShowModal(false);
            setEditTransaction(null);
          }}
          theme={theme}
        />
      )}

      {/* Transactions List */}
      <div className="transactions-list">
        {filteredTransactions.map(transaction => (
          <div key={transaction.id} className="transaction-item">
            <div className="transaction-info">
              <div className="transaction-category" style={{ 
                backgroundColor: theme.colors.secondary,
                color: theme.colors.text.inverse
              }}>
                {transaction.category}
              </div>
              <div className="transaction-details">
                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                <span>{transaction.description}</span>
                <span style={{ color: theme.colors.text.primary }}>
                  {transaction.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  })}
                </span>
              </div>
            </div>
            <div className="transaction-actions">
              <button 
                onClick={() => {
                  setEditTransaction(transaction);
                  setShowModal(true);
                }}
                style={{ color: theme.colors.primary }}
              >
                <EditOutlined />
              </button>
              <button
                onClick={() => handleDeleteTransaction(transaction.id)}
                style={{ color: theme.colors.warning }}
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
        ))}
      </div>

        {/* Add Expense FAB */}
        <button 
        className="fab"
        onClick={() => setShowModal(true)}
        style={{ 
          backgroundColor: theme.colors.accent,
          color: theme.colors.text.inverse
        }}
      >
        <PlusOutlined />
      </button>
    </div>
  );
};

// Transaction Modal Component with validation
const TransactionModal = ({ transaction, categories, onSave, onClose, theme }) => {
  const [formData, setFormData] = useState(transaction || {
    description: '',
    amount: '',
    category: ''
  });

  useEffect(() => {
    if (!transaction && categories.length > 0) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, transaction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category || categories.length === 0) {
      alert('Please create categories first!');
      return;
    }
    onSave({
      ...formData,
      amount: parseFloat(formData.amount)
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-content" style={{ 
        backgroundColor: theme.colors.background,
        color: theme.colors.text.primary
      }}>
        <h3>{transaction ? 'Edit Transaction' : 'New Transaction'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              required
              style={{
                borderColor: theme.colors.neutrals.border,
                color: theme.colors.text.primary
              }}
            />
          </div>
          
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              required
              style={{
                borderColor: theme.colors.neutrals.border,
                color: theme.colors.text.primary
              }}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              style={{
                borderColor: theme.colors.neutrals.border,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background
              }}
            >
              {categories.map(category => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button 
              type="submit"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {transaction ? 'Update' : 'Add'} Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrackExpensesPage;