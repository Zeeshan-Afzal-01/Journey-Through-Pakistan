import React from 'react';

export function PostCardSkeleton() {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="skeleton-avatar rounded-circle" style={{ width: 40, height: 40 }}></div>
          <div className="flex-grow-1">
            <div className="skeleton-text" style={{ width: '120px', height: '14px', marginBottom: '4px' }}></div>
            <div className="skeleton-text" style={{ width: '80px', height: '12px' }}></div>
          </div>
        </div>
        <div className="skeleton-text mb-2" style={{ width: '100%', height: '16px' }}></div>
        <div className="skeleton-text mb-2" style={{ width: '80%', height: '16px' }}></div>
        <div className="skeleton-image mb-2" style={{ width: '100%', height: '300px', borderRadius: '8px' }}></div>
        <div className="d-flex gap-3 mt-2">
          <div className="skeleton-text" style={{ width: '60px', height: '16px' }}></div>
          <div className="skeleton-text" style={{ width: '70px', height: '16px' }}></div>
        </div>
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <div className="skeleton-avatar rounded-circle" style={{ width: 40, height: 40 }}></div>
      <div className="flex-grow-1">
        <div className="skeleton-text" style={{ width: '120px', height: '14px', marginBottom: '4px' }}></div>
        <div className="skeleton-text" style={{ width: '80px', height: '12px' }}></div>
      </div>
      <div className="skeleton-button" style={{ width: '100px', height: '32px', borderRadius: '4px' }}></div>
    </div>
  );
}

export function HashtagSkeleton() {
  return (
    <div className="d-flex flex-wrap gap-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton-badge" style={{ width: '80px', height: '32px', borderRadius: '16px' }}></div>
      ))}
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="d-flex align-items-start gap-2 mb-2">
      <div className="skeleton-avatar rounded-circle" style={{ width: 28, height: 28 }}></div>
      <div className="bg-light rounded px-2 py-1 flex-grow-1">
        <div className="skeleton-text" style={{ width: '100px', height: '12px', marginBottom: '4px' }}></div>
        <div className="skeleton-text" style={{ width: '80%', height: '14px' }}></div>
      </div>
    </div>
  );
}

export function StatusBarSkeleton() {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body py-2">
        <div className="d-flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center">
              <div className="skeleton-circle rounded-circle mx-auto mb-1" style={{ width: 56, height: 56 }}></div>
              <div className="skeleton-text" style={{ width: '50px', height: '12px', margin: '0 auto' }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <>
      <div className="card shadow-sm mb-3">
        <div className="card-body d-flex flex-column align-items-center text-center">
          <div className="skeleton-circle rounded-circle mb-3" style={{ width: 120, height: 120 }}></div>
          <div className="skeleton-text mb-2" style={{ width: '150px', height: '20px' }}></div>
          <div className="skeleton-text" style={{ width: '200px', height: '14px' }}></div>
        </div>
      </div>
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="skeleton-text mb-3" style={{ width: '120px', height: '16px' }}></div>
          <div className="skeleton-text mb-2" style={{ width: '100%', height: '40px' }}></div>
          <div className="skeleton-text mb-2" style={{ width: '100%', height: '40px' }}></div>
          <div className="skeleton-text" style={{ width: '80%', height: '40px' }}></div>
        </div>
      </div>
    </>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="text-center mb-3">
          <div className="skeleton-circle rounded-circle mx-auto mb-2" style={{ width: 64, height: 64 }}></div>
          <div className="skeleton-text mx-auto mb-1" style={{ width: '120px', height: '16px' }}></div>
          <div className="skeleton-text mx-auto" style={{ width: '100px', height: '12px' }}></div>
        </div>
        <div className="skeleton-text mb-3" style={{ width: '100%', height: '24px' }}></div>
        <div className="skeleton-image mb-3" style={{ width: '100%', height: '400px', borderRadius: '8px' }}></div>
        <div className="d-flex justify-content-between pt-2">
          <div className="skeleton-text" style={{ width: '60px', height: '16px' }}></div>
          <div className="skeleton-text" style={{ width: '70px', height: '16px' }}></div>
          <div className="skeleton-text" style={{ width: '60px', height: '16px' }}></div>
        </div>
      </div>
    </div>
  );
}

export function GroupDetailSkeleton() {
  return (
    <>
      {/* Cover Section Skeleton */}
      <div className="group-cover-container">
        <div className="skeleton-image" style={{ width: '100%', height: '350px' }}></div>
      </div>
      <div className="container-fluid">
        <div className="row g-3 mt-3">
          {/* Left Sidebar Skeleton */}
          <div className="col-12 col-lg-3">
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="skeleton-text mb-3" style={{ width: '80px', height: '16px' }}></div>
                <div className="skeleton-text mb-2" style={{ width: '100%', height: '14px' }}></div>
                <div className="skeleton-text mb-2" style={{ width: '90%', height: '14px' }}></div>
                <div className="d-flex flex-column gap-2 mt-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="d-flex align-items-center gap-2">
                      <div className="skeleton-text" style={{ width: '16px', height: '16px' }}></div>
                      <div className="skeleton-text" style={{ width: '120px', height: '14px' }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="skeleton-text mb-3" style={{ width: '80px', height: '16px' }}></div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton-circle rounded-circle" style={{ width: 40, height: 40 }}></div>
                  ))}
                </div>
                <div className="skeleton-button" style={{ width: '100%', height: '32px', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
          {/* Main Content Skeleton */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2">
                  <div className="skeleton-avatar rounded-circle" style={{ width: 40, height: 40 }}></div>
                  <div className="skeleton-text flex-grow-1" style={{ width: '100%', height: '40px', borderRadius: '20px' }}></div>
                </div>
              </div>
            </div>
            {[1, 2, 3].map(i => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
          {/* Right Sidebar Skeleton */}
          <div className="col-12 col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="skeleton-text mb-3" style={{ width: '100px', height: '16px' }}></div>
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="d-flex align-items-center gap-2">
                      <div className="skeleton-badge" style={{ width: '24px', height: '20px', borderRadius: '4px' }}></div>
                      <div className="skeleton-text" style={{ width: '80%', height: '14px' }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="d-flex align-items-center gap-2 border rounded p-2 mb-2">
      <div className="skeleton-circle" style={{ width: 24, height: 24, borderRadius: '4px' }}></div>
      <div className="flex-grow-1">
        <div className="skeleton-text mb-1" style={{ width: '150px', height: '14px' }}></div>
        <div className="skeleton-text" style={{ width: '200px', height: '12px' }}></div>
      </div>
      <div className="skeleton-button" style={{ width: '80px', height: '28px', borderRadius: '4px' }}></div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="d-flex flex-column gap-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="d-flex align-items-start gap-2">
          <div className="skeleton-circle rounded-circle" style={{ width: 40, height: 40 }}></div>
          <div className="flex-grow-1">
            <div className="skeleton-text mb-2" style={{ width: '60%', height: '14px' }}></div>
            <div className="skeleton-text" style={{ width: '40%', height: '12px' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="container-fluid p-4">
      {/* Welcome Section Skeleton */}
      <div className="mb-4">
        <div className="skeleton-text mb-2" style={{ width: '300px', height: '28px' }}></div>
        <div className="skeleton-text" style={{ width: '500px', height: '16px' }}></div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="col-6 col-md-3">
            <div className="skeleton-button" style={{ width: '100%', height: '60px', borderRadius: '12px' }}></div>
          </div>
        ))}
      </div>

      {/* At a Glance Cards Skeleton */}
      <div className="mb-3">
        <div className="skeleton-text mb-3" style={{ width: '200px', height: '20px' }}></div>
      </div>
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="col-12 col-md-6 col-xl-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <div className="skeleton-text mb-2" style={{ width: '120px', height: '14px' }}></div>
                  <div className="skeleton-text" style={{ width: '60px', height: '48px' }}></div>
                </div>
                <div className="skeleton-circle" style={{ width: '22px', height: '22px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity and Graph Skeleton */}
      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="skeleton-text mb-3" style={{ width: '150px', height: '18px' }}></div>
              <div className="d-flex flex-column gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="d-flex justify-content-between align-items-center">
                    <div className="skeleton-text" style={{ width: '70%', height: '16px' }}></div>
                    <div className="skeleton-text" style={{ width: '80px', height: '14px' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="skeleton-text mb-3" style={{ width: '280px', height: '18px' }}></div>
              <div className="skeleton-image" style={{ width: '100%', height: '280px', borderRadius: '8px' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Skeleton */}
      <div className="mt-4">
        <div className="skeleton-text mb-3" style={{ width: '300px', height: '20px' }}></div>
        <div className="row g-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="col-12 col-md-6 col-xl-4">
              <div className="card recommendation-card shadow-sm h-100">
                <div className="skeleton-image" style={{ width: '100%', height: '200px' }}></div>
                <div className="card-body">
                  <div className="skeleton-text mb-2" style={{ width: '150px', height: '18px' }}></div>
                  <div className="skeleton-text mb-2" style={{ width: '100px', height: '14px' }}></div>
                  <div className="skeleton-text mb-1" style={{ width: '100%', height: '14px' }}></div>
                  <div className="skeleton-text" style={{ width: '80%', height: '14px' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

