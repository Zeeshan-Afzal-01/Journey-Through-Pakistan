import './SkeletonLoader.css';

// Skeleton for KPI Cards
export const SkeletonKPICard = () => (
  <div className="skeleton-kpi-card">
    <div className="skeleton-kpi-header">
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-icon"></div>
    </div>
    <div className="skeleton-text skeleton-value"></div>
    <div className="skeleton-text skeleton-change"></div>
  </div>
);

// Skeleton for Table
export const SkeletonTable = ({ rows = 5, columns = 6 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="skeleton-text skeleton-header-cell"></div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="skeleton-table-row">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="skeleton-text skeleton-cell"></div>
        ))}
      </div>
    ))}
  </div>
);

// Skeleton for Chart
export const SkeletonChart = () => (
  <div className="skeleton-chart">
    <div className="skeleton-text skeleton-chart-title"></div>
    <div className="skeleton-text skeleton-chart-subtitle"></div>
    <div className="skeleton-chart-content">
      <div className="skeleton-chart-bars">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-chart-bar" style={{ height: `${Math.random() * 60 + 40}%` }}></div>
        ))}
      </div>
    </div>
  </div>
);

// Skeleton for Activity Feed
export const SkeletonActivityFeed = ({ items = 5 }) => (
  <div className="skeleton-activity-feed">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="skeleton-activity-item">
        <div className="skeleton-icon skeleton-activity-icon"></div>
        <div className="skeleton-activity-content">
          <div className="skeleton-text skeleton-activity-text"></div>
          <div className="skeleton-text skeleton-activity-time"></div>
        </div>
      </div>
    ))}
  </div>
);

// Skeleton for Card
export const SkeletonCard = ({ children }) => (
  <div className="skeleton-card">
    {children}
  </div>
);

// Skeleton for User Row
export const SkeletonUserRow = () => (
  <div className="skeleton-user-row">
    <div className="skeleton-avatar"></div>
    <div className="skeleton-user-info">
      <div className="skeleton-text skeleton-name"></div>
      <div className="skeleton-text skeleton-email"></div>
    </div>
  </div>
);

// Generic Skeleton Text
export const SkeletonText = ({ width = '100%', height = '16px', className = '' }) => (
  <div 
    className={`skeleton-text ${className}`} 
    style={{ width, height }}
  ></div>
);

// Skeleton for Page Header
export const SkeletonPageHeader = () => (
  <div className="skeleton-page-header">
    <div className="skeleton-text skeleton-page-title"></div>
    <div className="skeleton-page-actions">
      <div className="skeleton-button"></div>
      <div className="skeleton-button"></div>
    </div>
  </div>
);

// Skeleton for Filters
export const SkeletonFilters = () => (
  <div className="skeleton-filters">
    <div className="skeleton-text skeleton-search"></div>
    <div className="skeleton-filter-dropdowns">
      <div className="skeleton-dropdown"></div>
      <div className="skeleton-dropdown"></div>
      <div className="skeleton-dropdown"></div>
    </div>
  </div>
);

// Skeleton for Settings Page
export const SkeletonSettings = () => (
  <div className="skeleton-settings">
    <div className="skeleton-settings-header">
      <div className="skeleton-text skeleton-settings-title"></div>
      <div className="skeleton-text skeleton-settings-subtitle"></div>
    </div>
    
    <div className="skeleton-settings-content">
      {Array.from({ length: 3 }).map((_, cardIndex) => (
        <div key={cardIndex} className="skeleton-settings-card">
          <div className="skeleton-text skeleton-card-title"></div>
          <div className="skeleton-text skeleton-card-description"></div>
          
          <div className="skeleton-settings-form">
            {Array.from({ length: 4 }).map((_, fieldIndex) => (
              <div key={fieldIndex} className="skeleton-form-group">
                <div className="skeleton-text skeleton-label"></div>
                <div className="skeleton-text skeleton-input"></div>
              </div>
            ))}
            
            <div className="skeleton-toggle-group">
              {Array.from({ length: 2 }).map((_, toggleIndex) => (
                <div key={toggleIndex} className="skeleton-toggle">
                  <div className="skeleton-checkbox"></div>
                  <div className="skeleton-text skeleton-toggle-label"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default {
  SkeletonKPICard,
  SkeletonTable,
  SkeletonChart,
  SkeletonActivityFeed,
  SkeletonCard,
  SkeletonUserRow,
  SkeletonText,
  SkeletonPageHeader,
  SkeletonFilters,
  SkeletonSettings
};


