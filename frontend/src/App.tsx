import './App.css'
import { Board } from './components/Board/Board'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Trello風タスクボード</h1>
      </header>
      <Board />
    </div>
  )
}

export default App
