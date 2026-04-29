import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { TimelineState, TimelineAction, TimeRange, TimelineEvent, TypeStats, IndustryStats } from '../types'

const initialState: TimelineState = {
  keyword: '',
  selectedIndustry: null,
  timeRange: 'month',
  events: [],
  typeStats: [],
  activeFilters: [],
  userIndustries: [],
  industryStats: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  total: 0,
  favoritedEventIds: [],
}

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case 'SET_KEYWORD':
      return { ...state, keyword: action.payload }
    case 'SET_SELECTED_INDUSTRY':
      return { ...state, selectedIndustry: action.payload, keyword: action.payload || '' }
    case 'SET_TIME_RANGE':
      return { ...state, timeRange: action.payload }
    case 'SET_EVENTS':
      return { ...state, events: action.payload }
    case 'SET_TYPE_STATS':
      return { ...state, typeStats: action.payload }
    case 'SET_ACTIVE_FILTERS':
      return { ...state, activeFilters: action.payload }
    case 'TOGGLE_FILTER': {
      const filter = action.payload
      const filters = state.activeFilters.includes(filter)
        ? state.activeFilters.filter((f) => f !== filter)
        : [...state.activeFilters, filter]
      return { ...state, activeFilters: filters }
    }
    case 'ADD_USER_INDUSTRY':
      return { ...state, userIndustries: [...state.userIndustries, action.payload] }
    case 'REMOVE_USER_INDUSTRY':
      return { ...state, userIndustries: state.userIndustries.filter((i) => i !== action.payload) }
    case 'SET_INDUSTRY_STATS':
      return { ...state, industryStats: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_PAGE':
      return { ...state, page: action.payload }
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload, page: 1 }
    case 'SET_TOTAL':
      return { ...state, total: action.payload }
    case 'SET_FAVORITED_EVENT_IDS':
      return { ...state, favoritedEventIds: action.payload }
    case 'ADD_FAVORITED_EVENT_ID':
      return { ...state, favoritedEventIds: [...state.favoritedEventIds, action.payload] }
    case 'REMOVE_FAVORITED_EVENT_ID':
      return { ...state, favoritedEventIds: state.favoritedEventIds.filter(id => id !== action.payload) }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

interface TimelineContextType {
  state: TimelineState
  dispatch: React.Dispatch<TimelineAction>
  setKeyword: (keyword: string) => void
  setSelectedIndustry: (industry: string | null) => void
  setTimeRange: (timeRange: TimeRange) => void
  setEvents: (events: TimelineEvent[]) => void
  setTypeStats: (stats: TypeStats[]) => void
  setActiveFilters: (filters: string[]) => void
  toggleFilter: (filter: string) => void
  addUserIndustry: (industry: string) => void
  removeUserIndustry: (industry: string) => void
  setIndustryStats: (stats: IndustryStats[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setTotal: (total: number) => void
  setFavoritedEventIds: (ids: string[]) => void
  addFavoritedEventId: (id: string) => void
  removeFavoritedEventId: (id: string) => void
}

const TimelineContext = createContext<TimelineContextType | null>(null)

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(timelineReducer, initialState)

  const value: TimelineContextType = {
    state,
    dispatch,
    setKeyword: (keyword) => dispatch({ type: 'SET_KEYWORD', payload: keyword }),
    setSelectedIndustry: (industry) => dispatch({ type: 'SET_SELECTED_INDUSTRY', payload: industry }),
    setTimeRange: (timeRange) => dispatch({ type: 'SET_TIME_RANGE', payload: timeRange }),
    setEvents: (events) => dispatch({ type: 'SET_EVENTS', payload: events }),
    setTypeStats: (stats) => dispatch({ type: 'SET_TYPE_STATS', payload: stats }),
    setActiveFilters: (filters) => dispatch({ type: 'SET_ACTIVE_FILTERS', payload: filters }),
    toggleFilter: (filter) => dispatch({ type: 'TOGGLE_FILTER', payload: filter }),
    addUserIndustry: (industry) => dispatch({ type: 'ADD_USER_INDUSTRY', payload: industry }),
    removeUserIndustry: (industry) => dispatch({ type: 'REMOVE_USER_INDUSTRY', payload: industry }),
    setIndustryStats: (stats) => dispatch({ type: 'SET_INDUSTRY_STATS', payload: stats }),
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error) => dispatch({ type: 'SET_ERROR', payload: error }),
    setPage: (page) => dispatch({ type: 'SET_PAGE', payload: page }),
    setPageSize: (size) => dispatch({ type: 'SET_PAGE_SIZE', payload: size }),
    setTotal: (total) => dispatch({ type: 'SET_TOTAL', payload: total }),
    setFavoritedEventIds: (ids) => dispatch({ type: 'SET_FAVORITED_EVENT_IDS', payload: ids }),
    addFavoritedEventId: (id) => dispatch({ type: 'ADD_FAVORITED_EVENT_ID', payload: id }),
    removeFavoritedEventId: (id) => dispatch({ type: 'REMOVE_FAVORITED_EVENT_ID', payload: id }),
  }

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}

export function useTimeline() {
  const context = useContext(TimelineContext)
  if (!context) {
    throw new Error('useTimeline must be used within TimelineProvider')
  }
  return context
}