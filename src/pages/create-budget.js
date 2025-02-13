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
  const [categories, setCategories] = useState([
    { id: '1', name: 'Rent', allocated: 0, spent: 0, type: 'essential' },
    { id: '2', name: 'Groceries', allocated: 0, spent: 0, type: 'essential' },
    { id: '3', name: 'Savings', allocated: 0, spent: 0, type: 'savings' },
  ]);
  const [remaining, setRemaining] = useState(0);
  const [newCategory, setNewCategory] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCategories((categories) => {
        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);
        return arrayMove(categories, oldIndex, newIndex);
      });
    }
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      setCategories([...categories, {
        id: Date.now().toString(),
        name: newCategory.trim(),
        allocated: 0,
        spent: 0,
        type: 'custom'
      }]);
      setNewCategory('');
    }
  };

  const updateAllocation = (id, value) => {
    const numericValue = value === '' ? 0 : parseInt(value.replace(/^0+/, ''), 10) || 0;
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, allocated: numericValue } : cat
    ));
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
        <div className="income-input">
          <label>Monthly Income</label>
          <input
            type="number"
            value={income || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/^0+/, '');
              setIncome(value ? parseInt(value, 10) : 0);
            }}
            style={{ color: theme.colors.text.primary }}
            min="0"
          />
          <div className="pay-period-toggle">
            <button
              onClick={() => setPayPeriod('monthly')}
              className={payPeriod === 'monthly' ? 'active' : ''}
            >
              Monthly
            </button>
            <button
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