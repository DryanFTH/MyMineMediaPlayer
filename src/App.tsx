import { HashRouter, Route, Routes } from 'react-router';

import { QueryClientProvider } from '@tanstack/react-query';

import './App.css';
import InitGuard from './components/InitGuard';
import Layout from './components/layout/Layout';
import { queryClient } from './lib/query-client';
import Dashboard from './pages/Dashboard';
import LibraryAnime from './pages/Library/Anime';
import LibaryEpisode from './pages/Library/Episode';
import FromBatch from './pages/Library/FromBatch';
import LibraryGenre from './pages/Library/Genre';
import Library from './pages/Library/Library';
import Onboarding from './pages/Onboarding';
import Anime from './pages/Otakudesu/Anime';
import Episode from './pages/Otakudesu/Episode';
import AnimeList from './pages/Otakudesu/Genre/AnimeList';
import List from './pages/Otakudesu/Genre/List';
import Ongoing from './pages/Otakudesu/Ongoing';
import Search from './pages/Otakudesu/Search';
import Season from './pages/Otakudesu/Season';
import Settings from './pages/Settings';

import 'unfonts.css';

function App() {
    return (
        <HashRouter>
            <InitGuard>
                <Layout>
                    <QueryClientProvider client={queryClient}>
                        <Routes>
                            <Route path='/onboarding' element={<Onboarding />} />

                            <Route path='/' element={<Dashboard />} />
                            <Route path='/settings' element={<Settings />} />

                            <Route path='/otakudesu'>
                                <Route path='search' element={<Search />} />
                                <Route path='ongoing' element={<Ongoing />} />
                                <Route path='season' element={<Season />} />
                                <Route path='anime/:anime' element={<Anime />} />
                                <Route path='episode/:episode' element={<Episode />} />
                                <Route path='genre'>
                                    <Route element={<List />} index />
                                    <Route path=':genre' element={<AnimeList />} />
                                </Route>
                            </Route>

                            <Route path='/library'>
                                <Route element={<Library />} index />
                                <Route path='from-batch' element={<FromBatch />} />

                                <Route path='anime/:anime'>
                                    <Route element={<LibraryAnime />} index />
                                    <Route
                                        path=':episode/:resolution'
                                        element={<LibaryEpisode />}
                                    />
                                </Route>

                                <Route path='genre'>
                                    <Route element={<LibraryGenre />} index />
                                </Route>
                            </Route>
                        </Routes>
                    </QueryClientProvider>
                </Layout>
            </InitGuard>
        </HashRouter>
    );
}

export default App;
