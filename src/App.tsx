/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useMemo, useEffect } from 'react';
import { UserWarning } from './UserWarning';
import { client as fetchClient } from './utils/fetchClient';
import { Todo } from './types/Todo';

const USER_ID = 3381;

export const App: React.FC = () => {
  // Estado que armazena a lista de todos
  const [todos, setTodos] = useState<Todo[]>([]);
  // Estado para exibir erros (quando falha no fetch ou em alguma ação)
  const [error, setError] = useState(false);
  // Estado para guardar o ID de um todo que está sendo deletado (mostra loader)
  const [deletingId] = useState<number | null>(null);
  // Estado do input para adicionar um novo todo
  const [newTodo, setNewTodo] = useState('');
  // Estado para controlar qual filtro está ativo: all, active ou completed
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  /* eslint-disable */
  // Estado para controlar o tipo de erro
  const [errorType, setErrorType] = useState<
    null | 'load' | 'update' | 'add' | 'delete' | 'empty'
  >(null);
  /* eslint-enable */

  // Se não houver usuário definido, mostra um aviso
  if (!USER_ID) {
    return <UserWarning />;
  }

  // useEffect para carregar os todos do servidor na montagem do componente
  // eslint-disable-next-line
  useEffect(() => {
    fetchClient
      .get(`/todos?userId=${USER_ID}`)
      .then((data: Todo[]) => setTodos(data))
      .catch(() => {
        setError(true);
        setErrorType('load');
      });
  }, []);

  // eslint-disable-next-line
  console.log(todos);

  // Filtra os todos com base no filtro atual (memoizado para performance)
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

  // Função para deletar quando clompeted tiver true
  const handleDelete = (list: Todo[]) => {
    const listOfClear = list.filter(iten => iten.completed);

    const promises = listOfClear.map(iten => {
      return fetchClient.delete(`/todos/${iten.id}`).catch(err => {
        setError(true);
        setErrorType('delete');
        // eslint-disable-next-line
        console.log(`Error ${err.status}`);
      });
    });

    Promise.all(promises)
      .then(() => {
        fetchClient
          .get<Todo[]>(`/todos?userId=${USER_ID}`)
          .then(data => setTodos(data))
          .catch(() => {
            setError(true);
            setErrorType('update');
          });
      })
      .catch(() => setError(true));
  };

  // Função para adicionar um novo todo
  const handleAddTodo = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newTodo.trim()) {
      setError(true);

      setErrorType('empty');

      return;
    }

    // eslint-disable-next-line
    console.log('Adding todo:', newTodo);

    const newTodoObj: Omit<Todo, 'id'> = {
      userId: USER_ID,
      title: newTodo.trim(),
      completed: false,
    };

    setTimeout(() => {
      fetchClient
        .post<Todo>('/todos', newTodoObj)
        .then(createdTodo => {
          setTodos(prev => [...prev, createdTodo]);
          setNewTodo('');
        })
        .catch(() => {
          setError(true);
          setErrorType('add');
        });
    }, 50);
  };

  // Função para alternar entre "feito" e "não feito"
  const handleToggle = (todo: Todo) => {
    setTimeout(() => {
      fetchClient
        .patch<Todo>(`/todos/${todo.id}`, { completed: !todo.completed })
        .then(updatedTodo => {
          setTodos(prev => prev.map(t => (t.id === todo.id ? updatedTodo : t)));
        })
        .catch(() => setError(true));
    }, 50);
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleAddTodo}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
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

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => handleDelete([todo])}
              >
                ×
              </button>

              {deletingId === todo.id && (
                <div data-cy="TodoLoader" className="modal overlay">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Hide the footer if there are no todos */}
        <footer className="todoapp__footer" data-cy="Footer">
          <span className="todo-count" data-cy="TodosCounter">
            3 items left
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

        {errorType === 'delete' && (
          <>
            <br />
            Unable to update a todo
          </>
        )}
      </div>
    </div>
  );
};
