import React from 'react';

const UsersList = (props) => {
  return (
    <div>
      {
        props.users.map((user) => {
          return (
            <div
              key={user.id}
              className="box"
            >
              <div className="level">
                <div className="level-left">
                  <h4 className="title is-4 mb-1">
                    {user.username}
                  </h4>
                </div>
                <div className="level-right">
                  {/* Sync Status Indicator */}
                  {user.synced ? (
                    <span className="tag is-success is-small">
                      ✅ Synced
                    </span>
                  ) : (
                    <span className="tag is-warning is-small">
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>

              <p className="subtitle is-6 has-text-grey">
                {user.email}
              </p>

              {/* Additional metadata for debugging */}
              {user.createdAt && (
                <p className="is-size-7 has-text-grey-light">
                  Created: {new Date(user.createdAt).toLocaleString()}
                </p>
              )}
            </div>
          )
        })
      }

      {/* Empty state */}
      {props.users.length === 0 && (
        <div className="has-text-centered has-text-grey">
          <p className="is-size-5">No users yet</p>
          <p className="is-size-6">Add your first user above!</p>
        </div>
      )}
    </div>
  )
};

export default UsersList;
