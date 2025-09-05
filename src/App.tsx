/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserWarning } from './UserWarning';
import { client as fetchClient } from './utils/fetchClient';
import { Todo } from './types/Todo';

import { filteredTodos } from './components/filteredTodos';

const USER_ID = 3381;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState(false);
  /* eslint-disable */
  const [errorType, setErrorType] = useState<
    null | 'load' | 'update' | 'add' | 'delete' | 'empty'
  >(null);
  /* eslint-enable */
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [changeQuantity, setChangeQuantity] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editledTitle, setEditledTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [processingIds, setProcessingIds] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  if (!USER_ID) {
    return <UserWarning />;
  }

  // eslint-disable-next-line
  useEffect(() => {
    fetchClient
      .get<Todo[]>(`/todos?userId=${USER_ID}`)
      .then(data => {
        setTodos(data);
      })
      .catch(() => {
        setError(true);
        setErrorType('load');
      });
  }, []);

  // eslint-disable-next-line
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  /* eslint-disable */
  useEffect(() => {
    setChangeQuantity(
      todos.filter(d => !d.completed && d.id !== creatingId).length,
    );
  }, [todos, creatingId]);
  /* eslint-enable */

  const handleDelete = (list: Todo[]) => {
    if (list.length === 0) {
      return;
    }

    const listOfClear =
      list.length === 1 ? [...list] : list.filter(t => t.completed);

    // Mostrar loaders para todos os todos sendo deletados
    setProcessingIds(prev => [...prev, ...listOfClear.map(t => t.id)]);

    Promise.allSettled(
      listOfClear.map(todo =>
        fetchClient
          .delete(`/todos/${todo.id}`)
          .then(() => ({ todo, success: true }))
          .catch(() => ({ todo, success: false })),
      ),
    )
      .then(results => {
        const failedIds = results
          .filter(r => r.status === 'fulfilled' && !r.value.success)
          .map(r => r.value.todo.id);

        setTodos(prev =>
          prev.filter(
            t =>
              !listOfClear.some(c => c.id === t.id) || failedIds.includes(t.id),
          ),
        );

        if (failedIds.length > 0) {
          setError(true);
          setErrorType('delete');
        }
      })
      .finally(() => {
        setProcessingIds(prev =>
          prev.filter(id => !listOfClear.some(t => t.id === id)),
        );

        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      });
  };

  const deleteTodo = (todoId: number) => {
    const delTodo = todos.find(t => t.id === todoId);

    if (!delTodo) {
      return;
    }

    setProcessingIds(prev => [...prev, todoId]);

    fetchClient
      .delete(`/todos/${todoId}`)
      .then(() => {
        setTodos(prev => prev.filter(todo => todo.id !== todoId));
      })
      .catch(() => {
        setError(true);
        setErrorType('delete');
      })
      .finally(() => {
        setProcessingIds(prev => prev.filter(id => id !== todoId));

        if (inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      });
  };

  /* eslint-disable @typescript-eslint/indent */
  const handleAddTodo = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTodo.trim()) {
      setError(true);

      setErrorType('empty');

      return;
    }

    const tempTodo = Date.now();
    const newTodoObj: Omit<Todo, 'id'> = {
      id: tempTodo,
      userId: USER_ID,
      title: newTodo.trim(),
      completed: false,
    };

    setTodos(prev => [...prev, newTodoObj]);
    setCreatingId(tempTodo);

    setIsSubmitting(true);

    fetchClient
      .post<Omit<Todo, 'id'>>('/todos', {
        userId: USER_ID,
        title: newTodo.trim(),
        completed: false,
      })
      .then(createdTodo => {
        setTodos((prev: Todo[]) =>
          prev.map(t => (t.id === tempTodo ? createdTodo : t)),
        );
        setNewTodo('');
        setCreatingId(null);
      })
      .catch(() => {
        setTodos(prev => prev.filter(t => t.id !== tempTodo));
        setError(true);
        setErrorType('add');
        setCreatingId(null);
      })
      .finally(() => {
        setIsSubmitting(false);

        if (inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      });
  };
  /* eslint-disable @typescript-eslint/indent */

  const handleToggleAll = () => {
    const allCompleted = todos.every(todo => todo.completed);
    const newCompletedStatus = !allCompleted;

    setProcessingIds(todos.map(todo => todo.id));

    Promise.allSettled(
      todos.map(todo =>
        fetchClient.patch(`/todos/${todo.id}`, {
          completed: newCompletedStatus,
        }),
      ),
    )
      .then(results => {
        const updatedTodos = todos.map((todo, index) => ({
          ...todo,
          completed:
            results[index].status === 'fulfilled'
              ? newCompletedStatus
              : todo.completed,
        }));

        setTodos(updatedTodos);
      })
      .catch(() => {
        setError(true);
        setErrorType('update');
      })
      .finally(() => {
        setProcessingIds([]);
      });
  };

  const handleToggle = (todo: Todo) => {
    setProcessingIds(prev => [...prev, todo.id]);

    fetchClient
      .patch<Todo>(`/todos/${todo.id}`, { completed: !todo.completed })
      .then(updatedTodo => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? updatedTodo : t)));
      })
      .catch(() => {
        setError(true);
        setErrorType('update');
      })
      .finally(() => {
        setProcessingIds(prev => prev.filter(id => id !== todo.id));
      });
  };

  /* eslint-disable */
  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      setError(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [error]);
  /* eslint-enable */

  const handleUpdateTodo = (todo: Todo, newTitle: string) => {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      // se o título ficar vazio, deleta o todo
      deleteTodo(todo.id);

      return;
    }

    fetchClient
      .patch<Todo>(`/todos/${todo.id}`, { title: trimmedTitle })
      .then(updatedTodo => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? updatedTodo : t)));
        setEditingId(null);
        setEditledTitle('');
      })
      .catch(() => {
        setError(true);
        setErrorType('update');
      });
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className={`todoapp__toggle-all ${todos.length > 0 && todos.every(todo => todo.completed) ? 'active' : ''}`}
            data-cy="ToggleAllButton"
            onClick={handleToggleAll}
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleAddTodo}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
            >
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="todo__status-label" htmlFor={`todo-${todo.id}`}>
                <input
                  id={`todo-${todo.id}`}
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo)}
                />
              </label>

              <span
                data-cy="TodoTitle"
                className="todo__title"
                onDoubleClick={() => {
                  setEditingId(todo.id);
                  setEditledTitle(todo.title);
                }}
              >
                {editingId === todo.id ? (
                  <input
                    type="text"
                    value={editledTitle}
                    autoFocus
                    onChange={e => setEditledTitle(e.target.value)}
                    onBlur={() => handleUpdateTodo(todo, editledTitle)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleUpdateTodo(todo, editledTitle);
                      }

                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditledTitle('');
                      }
                    }}
                  />
                ) : (
                  todo.title
                )}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => deleteTodo(todo.id)}
              >
                ×
              </button>

              <div
                data-cy="TodoLoader"
                className={`modal overlay ${
                  processingIds.includes(todo.id) || creatingId === todo.id
                    ? 'is-active'
                    : 'hidden'
                }`}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${changeQuantity} items left`}
            </span>

            {/* Active link should have the 'selected' class */}
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={filteredTodos.every(todo => !todo.completed)}
              onClick={() => handleDelete(filteredTodos)}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${!error ? 'hidden' : ''}`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setError(false)}
        />
        {/* show only one message at a time */}
        {errorType === 'load' && (
          <>
            <br />
            Unable to load todos
          </>
        )}

        {errorType === 'empty' && (
          <>
            <br />
            Title should not be empty
          </>
        )}

        {errorType === 'add' && (
          <>
            <br />
            Unable to add a todo
          </>
        )}

        {errorType === 'delete' && (
          <>
            <br />
            Unable to delete a todo
          </>
        )}

        {errorType === 'update' && (
          <>
            <br />
            Unable to update a todo
          </>
        )}
      </div>
    </div>
  );
};
