export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TodoDraft = Pick<Todo, 'title' | 'description'>;
export type TodoPatch = Partial<TodoDraft & Pick<Todo, 'completed'>>;
