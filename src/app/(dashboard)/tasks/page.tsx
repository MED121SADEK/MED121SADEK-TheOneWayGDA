import TodoApp from '@/components/tasks/todo-app'

export const metadata = {
  title: 'Tasks',
  description: 'Manage your tasks and to-do lists',
}

export default function TasksPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <TodoApp />
    </div>
  )
}
