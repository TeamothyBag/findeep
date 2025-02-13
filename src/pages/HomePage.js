import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { MenuOutlined, DollarOutlined, PieChartOutlined, TrophyOutlined, LineChartOutlined } from '@ant-design/icons';
import './HomePage.css';

const HomePage = () => {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePreview, setActivePreview] = useState(null);
  const sideNavRef = useRef(null);
  const menuToggleRef = useRef(null);

  const cards = [
    { 
      title: 'Create a Budget',
      icon: <DollarOutlined />,
      text: 'Set up your budget and manage your finances effectively.',
      link: 'Get Started',
      path: '/create-budget',
      preview: 'Start with 50/30/20 rule'
    },
    {
      title: 'Track Your Expenses',
      icon: <PieChartOutlined />,
      text: 'Keep an eye on your spending and stay within your budget.',
      link: 'Track Expenses',
      path: '/expenses',
      preview: 'Weekly spending breakdown'
    },
    {
      title: 'Set Savings Goals',
      icon: <TrophyOutlined />,
      text: 'Define your financial goals and monitor your progress.',
      link: 'Set Goals',
      path: '/savings-goals',
      preview: 'Save for your dreams'
    },
    {
      title: 'Manage Your Debt',
      icon: <LineChartOutlined />,
      text: 'Get tips and strategies to pay off your debt faster.',
      link: 'Manage Debt',
      path: '/debt-management',
      preview: 'Debt payoff calculator'
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && 
          !sideNavRef.current.contains(event.target) && 
          !menuToggleRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const Logo = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="logo-svg">
      <path 
        d="M50 15Q30 35, 50 85Q70 35, 50 15" 
        fill={theme.colors.accent}
        stroke={theme.colors.primary}
        strokeWidth="8"
      />
      <circle 
        cx="50" 
        cy="50" 
        r="38" 
        fill="none" 
        stroke={theme.colors.primary} 
        strokeWidth="8"
      />
    </svg>
  );

  return (
    <div className="homepage" style={{ backgroundColor: theme.colors.background }}>
      {/* Mobile Header */}
      <header className="mobile-header" style={{ 
        backgroundColor: theme.colors.primary,
        color: theme.colors.text.inverse
      }}>
        <button 
          ref={menuToggleRef}
          className="menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ color: theme.colors.text.inverse }}
        >
          <MenuOutlined />
        </button>
        <div className="logo-container">
          <Logo size={32} />
          <h1 className="logo-text">FinDeep</h1>
        </div>
      </header>

      {/* Side Navigation */}
      <nav 
        ref={sideNavRef}
        className={`side-nav ${isMenuOpen ? 'open' : ''}`} 
        style={{ backgroundColor: theme.colors.primary }}
      >
        <div className="nav-content">
          <div className="nav-logo">
            <Logo size={48} />
            <h2 style={{ color: theme.colors.text.inverse }}>FinDeep</h2>
          </div>
          {cards.map((card) => (
            <Link 
              key={card.path}
              to={card.path} 
              className="nav-link"
              style={{ color: theme.colors.text.inverse }}
              onClick={() => setIsMenuOpen(false)}
            >
              {card.icon} {card.title}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="content-wrapper">
        <div className="cards-grid">
          {cards.map((card, index) => (
            <div 
              key={index}
              className="card"
              onMouseEnter={() => setActivePreview(index)}
              onMouseLeave={() => setActivePreview(null)}
              style={{ 
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.neutrals.border}`
              }}
            >
              {/* Preview Badge */}
              <div 
                className={`preview-badge ${activePreview === index ? 'visible' : ''}`}
                style={{ 
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.text.inverse
                }}
              >
                {card.preview}
              </div>

              <div className="card-content">
                <div className="card-icon" style={{ color: theme.colors.primary }}>
                  {React.cloneElement(card.icon, { style: { fontSize: '28px' } })}
                </div>
                <h2 style={{ color: theme.colors.text.primary }}>{card.title}</h2>
                <p style={{ color: theme.colors.text.secondary }}>{card.text}</p>
                <Link 
                  to={card.path} 
                  className="card-link" 
                  style={{ 
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.text.inverse
                  }}
                >
                  {card.link}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mobile-footer" style={{ 
        backgroundColor: theme.colors.primary,
        color: theme.colors.text.inverse
      }}>
        <p>© 2025 FinDeep. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;