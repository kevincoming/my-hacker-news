import * as React from 'react';
import axios from 'axios';
import { List } from './List';
import { SearchForm } from './SearchForm';

const API_BASE = 'https://hn.algolia.com/api/v1/';
const API_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';

const storiesReducer = (state, action) => {
  switch (action.type) {
    case 'STORIES_FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case 'STORIES_FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data:
          action.payload.data === 0
            ? action.payload.list
            : state.data.concat(action.payload.list),
        page: action.payload.page,
      };
    case 'STORIES_FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case 'REMOVE_STORY':
      return {
        ...state,
        data: state.data.filter(
          (story) => action.payload.objectID !== story.objectID
        ),
      };
    default:
      throw new Error();
  }
};

const useStorageState = (key, initialState) => {
  const [value, setValue] = React.useState(
    localStorage.getItem(key) || initialState
  );

  React.useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue];
};

const extractSearchTerm = (url) => url
  .substring(url.lastIndexOf('?') + 1, url.lastIndexOf('&'))
  .replace(PARAM_SEARCH, '');

const getLastSearches = (urls) => urls
  .reduce((result, url, index) => {
    const searchTerm = extractSearchTerm(url);

    if (index === 0) {
      return result.concat(searchTerm);
    }

    const previousSearchTerm = result[result.length - 1];

    if (searchTerm === previousSearchTerm) {
      return result;
    } else {
      return result.concat(searchTerm);
    }
  }, [])
  .slice(-6).slice(0, -1)
  .map(extractSearchTerm);

const getUrl = (searchTerm, page) =>
  `${API_BASE}${API_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}`;

const App = () => {
  const [searchTerm, setSearchTerm] = useStorageState('search', 'React');
  const [stories, dispatchStories] = React.useReducer(
    storiesReducer,
    { data: [], page: 0, isLoading: false, isError: false }
  );

  const [urls, setUrls] = React.useState([
    getUrl(searchTerm, 0)
  ]);

  const handleSearchInput = (event) => {
    setSearchTerm(event.target.value);
  }

  const handleSearch = (searchTerm, page) => {
    const url = getUrl(searchTerm, page);
    setUrls(urls.concat(url));
  };

  const handleSearchSubmit = (event) => {
    handleSearch(searchTerm, 0);

    event.preventDefault();
  }

  const handleFetchStories = React.useCallback(async () => {
    dispatchStories({ type: 'STORIES_FETCH_INIT' });
    try {
      const lastUrl = urls[urls.length - 1];
      const result = await axios.get(lastUrl);

      dispatchStories({
        type: 'STORIES_FETCH_SUCCESS',
        payload: {
          list: result.data.hits,
          page: result.data.page,
        },
      });
    } catch {
      dispatchStories({ type: 'STORIES_FETCH_FAILURE' });
    }

  }, [urls]);

  const handleLastSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    handleSearch(searchTerm, 0);
  }

  const lastSearches = getLastSearches(urls);

  React.useEffect(() => {
    handleFetchStories();
  }, [handleFetchStories]);

  const handleRemoveStory = (item) => {
    dispatchStories({
      type: 'REMOVE_STORY',
      payload: item,
    })
  }

  const handleMore = () => {
    const lastUrl = urls[urls.length - 1];
    const searchTerm = extractSearchTerm(lastUrl);
    handleSearch(searchTerm, stories.page + 1);
  }

  return (
    <div className>
      <h1 className>My hacker stories</h1>

      <SearchForm
        searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        onSearchSubmit={handleSearchSubmit}
      />
      <LastSearch
        lastSearches={lastSearches}
        onLastSearch={handleLastSearch}
      />

      <hr />
      {stories.isError && <p>Something went wrong...</p>}

      <List list={stories.data} onRemoveItem={handleRemoveStory} />
      
      {stories.isLoading ? <p>Loading...</p> :
        (<button type="button" onClick={handleMore}>
          More
        </button>)
      }


    </div>
  );
}

const LastSearch = ({ lastSearches, onLastSearch }) => (
  <>
    {lastSearches.map((searchTerm, index) => (
      <button
        key={searchTerm + index}
        type="button"
        onClick={() => onLastSearch(searchTerm)}
      >
        {searchTerm}
      </button>
    ))}
  </>
)


export default App;