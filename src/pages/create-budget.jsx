import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { VictoryPie, VictoryTooltip } from 'victory';
import { PlusOutlined, EditOutlined, AlertOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './CreateBudgetPage.css';


// Initialize IndexedDB
const DB_NAME = 'FinDeepDB';
const DB_VERSION = 1;
const STORE_NAMES = {
  CATEGORIES: 'categories',
  BUDGET: 'budget'
};

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
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

// IndexedDB operations
const addCategoryToDB = async (category) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAMES.CATEGORIES, 'readwrite');
  tx.objectStore(STORE_NAMES.CATEGORIES).put(category);
  return tx.complete;
};

const getAllCategoriesFromDB = async () => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAMES.CATEGORIES, 'readonly');
    const request = tx.objectStore(STORE_NAMES.CATEGORIES).getAll();
    request.onsuccess = () => resolve(request.result);
  });
};

const updateCategoryInDB = async (category) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAMES.CATEGORIES, 'readwrite');
  tx.objectStore(STORE_NAMES.CATEGORIES).put(category);
  return tx.complete;
};

const saveBudgetToDB = async (budgetData) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAMES.BUDGET, 'readwrite');
  tx.objectStore(STORE_NAMES.BUDGET).put({ 
    id: 'current', 
    ...budgetData 
  });
  return tx.complete;
};

const getBudgetFromDB = async () => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAMES.BUDGET, 'readonly');
    const request = tx.objectStore(STORE_NAMES.BUDGET).get('current');
    request.onsuccess = () => resolve(request.result);
  });
};


// Color generator function
const generateCategoryColors = (count) => {
  const colors = [];
  const hueStep = 360 / count;
  for(let i = 0; i < count; i++) {
    colors.push(`hsl(${i * hueStep}, 70%, 50%)`);
  }
  return colors;
};

const SortableItem = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="drag-handle" {...listeners}>
        ⠿
      </div>
      {children}
    </div>
  );
};

const CreateBudgetPage = () => {
  const theme = useTheme();
  const [income, setIncome] = useState(0);
  const [payPeriod, setPayPeriod] = useState('monthly');
  const [categories, setCategories] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [newCategory, setNewCategory] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

    // Load initial data from IndexedDB
    useEffect(() => {
      const loadInitialData = async () => {
        try {
          const [dbCategories, dbBudget] = await Promise.all([
            getAllCategoriesFromDB(),
            getBudgetFromDB()
          ]);
  
          if (dbCategories.length > 0) {
            setCategories(dbCategories);
          }
  
          if (dbBudget) {
            setIncome(dbBudget.income);
            setPayPeriod(dbBudget.payPeriod);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
  
      loadInitialData();
    }, []);



      // Save categories when they change
  useEffect(() => {
    const saveCategories = async () => {
      try {
        const tx = categories.map(category => 
          updateCategoryInDB(category)
        );
        await Promise.all(tx);
      } catch (error) {
        console.error('Error saving categories:', error);
      }
    };

    if (categories.length > 0) {
      saveCategories();
    }
  }, [categories]);

    // Remove the useEffect that auto-saves budget
  // Add this state for temporary income input
  const [tempIncome, setTempIncome] = useState(income);

  // Handle saving budget to DB
  const handleSaveBudget = async () => {
    try {
      await saveBudgetToDB({
        income: tempIncome,
        payPeriod
      });
      setIncome(tempIncome); // Update the displayed income after successful save
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };



  // Generate unique colors whenever categories change
  const categoryColors = generateCategoryColors(categories.length);

  useEffect(() => {
    const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0);
    setRemaining(income - totalAllocated);
  }, [income, categories]);

  useEffect(() => {
    const suggestions = [];
    const savings = categories.find(c => c.name === 'Savings')?.allocated || 0;
    
    if (savings < income * 0.1) {
      suggestions.push(`Consider allocating at least 10% to savings ($${(income * 0.1).toFixed(0)})`);
    }

    if (remaining < -50) {
      suggestions.push(`You're over budget! Reduce allocations by $${Math.abs(remaining).toFixed(0)}`);
    }

    setAiSuggestions(suggestions);
  }, [remaining, income, categories]);

  // Modified handleDragEnd function
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCategories((prevCategories) => {
        const updatedCategories = arrayMove(
          prevCategories,
          prevCategories.findIndex(c => c.id === active.id),
          prevCategories.findIndex(c => c.id === over.id)
        );
        
        // Update IndexedDB with new order
        updatedCategories.forEach((category, index) => {
          updateCategoryInDB({ ...category, order: index });
        });

        return updatedCategories;
      });
    }
  };
  
  // Modified addCategory function
  const addCategory = async () => {
    if (newCategory.trim()) {
      const newCat = {
        id: Date.now().toString(),
        name: newCategory.trim(),
        allocated: 0,
        spent: 0,
        type: 'custom'
      };
      
      try {
        await addCategoryToDB(newCat);
        setCategories(prev => [...prev, newCat]);
        setNewCategory('');
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
  };

 // Modified updateAllocation function
 const updateAllocation = async (id, value) => {
  const numericValue = value === '' ? 0 : parseInt(value.replace(/^0+/, ''), 10) || 0;
  
  setCategories(prev => 
    prev.map(cat => 
      cat.id === id ? { ...cat, allocated: numericValue } : cat
    )
  );

  try {
    const categoryToUpdate = categories.find(c => c.id === id);
    await updateCategoryInDB({ ...categoryToUpdate, allocated: numericValue });
  } catch (error) {
    console.error('Error updating allocation:', error);
  }
};

  const chartData = categories.filter(c => c.allocated > 0).map(category => ({
    x: category.name,
    y: category.allocated,
    label: `${category.name}\n$${category.allocated.toLocaleString()}`
  }));

  return (
    <div className="budget-page" style={{ backgroundColor: theme.colors.background }}>
            {/* Income Section */}
            <div className="income-section" style={{ backgroundColor: theme.colors.primary }}>
        <div className="income-input ">
          <label>Monthly Income</label>
          <input
            type="number"
            value={tempIncome || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/^0+/, '');
              setTempIncome(value ? parseInt(value, 10) : 0);
            }}
            style={{ color: theme.colors.text.primary }}
            min="0"
          />
          <button 
          className='save-income'
            onClick={handleSaveBudget}
            style={{ backgroundColor: theme.colors.accent} }
          >
            <PlusOutlined /> Save
          </button>
          <div className="pay-period-toggle">
            <button
              type="button"
              onClick={() => setPayPeriod('monthly')}
              className={payPeriod === 'monthly' ? 'active' : ''}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPayPeriod('biweekly')}
              className={payPeriod === 'biweekly' ? 'active' : ''}
            >
              Bi-Weekly
            </button>
          </div>
        </div>
        
        <div className="remaining-balance" style={{ color: remaining < 0 ? theme.colors.warning : theme.colors.accent }}>
          <h3>${Math.abs(remaining).toLocaleString()} {remaining < 0 ? 'Over' : 'Remaining'}</h3>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="ai-suggestions">
          <h4><AlertOutlined /> Smart Suggestions</h4>
          {aiSuggestions.map((suggestion, index) => (
            <div key={index} className="suggestion">
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* Budget Visualization */}
      <div className="visualization-section">
        {chartData.length > 0 ? (
          <VictoryPie
            data={chartData}
            innerRadius={80}
            labelComponent={<VictoryTooltip flyoutStyle={{ fill: theme.colors.background }} />}
            style={{
              labels: { fill: theme.colors.text.primary, fontSize: 12 },
              data: {
                fill: ({ index }) => categoryColors[index % categoryColors.length]
              }
            }}
          />
        ) : (
          <div className="empty-state">Allocate funds to see breakdown</div>
        )}
      </div>

      {/* Category Allocation */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories}
          strategy={verticalListSortingStrategy}
        >
          <div className="category-list">
            {categories.map((category) => (
              <SortableItem key={category.id} id={category.id}>
                <div className="category-card" style={{ 
                  borderLeft: `4px solid ${categoryColors[categories.findIndex(c => c.id === category.id)]}`
                }}>
                  <div className="category-header">
                    <h4>{category.name}</h4>
                    {category.type === 'custom' && <EditOutlined />}
                  </div>
                  
                  <div className="allocation-input">
                    <input
                      type="number"
                      value={category.allocated || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/^0+/, '');
                        updateAllocation(category.id, value);
                      }}
                      min="0"
                      step="100"
                      style={{ 
                        color: category.allocated > (income * 0.4) ? theme.colors.warning : theme.colors.text.primary 
                      }}
                    />
                    <span>$ allocated</span>
                  </div>

                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(category.spent / category.allocated) * 100}%`,
                        backgroundColor: categoryColors[categories.findIndex(c => c.id === category.id)]
                      }}
                    />
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Category */}
      <div className="add-category">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Create custom category"
        />
        <button 
          onClick={addCategory}
          style={{ backgroundColor: theme.colors.accent }}
        >
          <PlusOutlined /> Add
        </button>
      </div>
    </div>
  );
};

export default CreateBudgetPage;