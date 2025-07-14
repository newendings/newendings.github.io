
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Users, ClipboardList, BarChart2, ArrowLeft, Trash2, Edit, Save, Moon, FolderDown, Eraser, FlagOff, ChevronRight } from 'lucide-react';

// --- Helper Functions ---
const generateId = () => `id_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

const getAbbaInfoForPoint = (pointNumber, aGender) => {
    const bGender = aGender === 'MMP' ? 'FMP' : 'MMP';
    const customSequence = {
        1: { gender: 'A', num: 2 }, 2: { gender: 'B', num: 1 }, 3: { gender: 'B', num: 2 },
        4: { gender: 'A', num: 1 }
    };
    const cycle = Math.floor((pointNumber - 1) / 4);
    const pointInCycle = (pointNumber - 1) % 4 + 1;
    const pointInfo = customSequence[pointInCycle];
    let displayGender = pointInfo.gender === 'A' ? aGender : bGender;

    return {
        label: `${displayGender} ${pointInfo.num}`,
        majorityGender: displayGender,
        requiredMMPs: displayGender === 'MMP' ? 4 : 3,
        requiredFMPs: displayGender === 'FMP' ? 4 : 3,
    };
};

// --- Main App Component ---
export default function App() {
    const [currentScreen, setCurrentScreen] = useState('roster');
    const [roster, setRoster] = useState([]);
    const [gameHistory, setGameHistory] = useState([]);
    const [game, setGame] = useState(null);
    const [activePointIndex, setActivePointIndex] = useState(0);

    useEffect(() => {
        try {
            const savedRoster = localStorage.getItem('moonlight-roster');
            if (savedRoster) setRoster(JSON.parse(savedRoster));
            const savedHistory = localStorage.getItem('moonlight-game-history');
            if (savedHistory) setGameHistory(JSON.parse(savedHistory));
        } catch (error) { console.error("Could not load data", error); }
    }, []);

    useEffect(() => { try { localStorage.setItem('moonlight-roster', JSON.stringify(roster)); } catch (error) { console.error("Could not save roster", error); } }, [roster]);
    useEffect(() => { try { localStorage.setItem('moonlight-game-history', JSON.stringify(gameHistory)); } catch (error) { console.error("Could not save history", error); } }, [gameHistory]);

    const navigateTo = (screen, context = null) => {
        if (screen === 'game' && roster.length < 7) { alert("Please add at least 7 players to the roster before starting a game."); return; }
        if (screen === 'game') { 
            // If there's an active game, go to it; otherwise go to game hub
            if (game && !game.isComplete) {
                setCurrentScreen('game');
            } else {
                setCurrentScreen('game_hub');
            }
            return; 
        }
        if (screen === 'view_game') { setGame(context); setActivePointIndex(0); setCurrentScreen('game'); return; }
        if (screen === 'stats') { setCurrentScreen('stats'); return; }
        setCurrentScreen(screen);
    };

    const startNewGame = (initialOffense, aGender, opponentName) => {
        const newGame = {
            id: generateId(), roster: JSON.parse(JSON.stringify(roster)), initialOffense, aGender, opponentName: opponentName || 'Opponent',
            startTime: new Date().toISOString(), isComplete: false, points: [{ pointNumber: 1, startingOn: initialOffense === 'Moonlight' ? 'Offense' : 'Defense', line: [], outcome: 'In Progress', assist: null, goal: null, abbaInfo: getAbbaInfoForPoint(1, aGender) }],
            moonlightScore: 0, opponentScore: 0, isHalftime: false,
        };
        setGame(newGame);
        setActivePointIndex(0);
        setCurrentScreen('game');
    };

    const endGame = (gameToEnd, reason) => {
        let finalPoints = gameToEnd.points;
        if (reason === "Ended manually") { finalPoints = gameToEnd.points.slice(0, -1); }
        const finalScoreMoonlight = finalPoints.filter(p => p.outcome === 'Moonlight Score').length;
        const finalScoreOpponent = finalPoints.filter(p => p.outcome === 'Opponent Score').length;
        const completedGame = { ...gameToEnd, points: finalPoints, moonlightScore: finalScoreMoonlight, opponentScore: finalScoreOpponent, isComplete: true, endTime: new Date().toISOString(), endReason: reason };
        setGameHistory(prev => [completedGame, ...prev.filter(g => g.id !== completedGame.id)]);
        setGame(null);
        setCurrentScreen('game_hub');
    }

    const updatePlayer = (updatedPlayer) => { setRoster(roster.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)); };
    const deletePlayer = (playerId) => { if (window.confirm("Are you sure?")) setRoster(roster.filter(p => p.id !== playerId)); };

    const screens = {
        roster: <RosterScreen roster={roster} setRoster={setRoster} updatePlayer={updatePlayer} deletePlayer={deletePlayer} />,
        game_hub: <GameHubScreen gameHistory={gameHistory} setGameHistory={setGameHistory} onStartNew={() => setCurrentScreen('game_setup')} onViewGame={(g) => navigateTo('view_game', g)} />,
        game_setup: <GameSetupScreen onStartGame={startNewGame} onBack={() => setCurrentScreen('game_hub')} />,
        game: <LiveGameScreen game={game} setGame={setGame} activePointIndex={activePointIndex} setActivePointIndex={setActivePointIndex} navigateTo={navigateTo} onEndGame={endGame}/>,
        stats: <StatsScreen roster={roster} gameHistory={gameHistory} onBack={() => setCurrentScreen('game_hub')} />,
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
            <div className="max-w-4xl mx-auto p-4">
                <header className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
                    <div className="flex items-center space-x-3">
                        <Moon className="text-cyan-400" size={28}/>
                        <h1 className="text-2xl font-bold tracking-wider text-white">MOONLIGHT</h1>
                    </div>
                </header>
                <nav className="flex justify-center bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg mb-8 p-2 space-x-2">
                    <NavButton icon={<Users/>} label="Roster" isActive={currentScreen === 'roster'} onClick={() => setCurrentScreen('roster')} />
                    <NavButton icon={<ClipboardList/>} label="Game" isActive={['game_hub', 'game_setup', 'game'].includes(currentScreen)} onClick={() => navigateTo('game')} />
                    <NavButton icon={<BarChart2/>} label="Stats" isActive={currentScreen === 'stats'} onClick={() => setCurrentScreen('stats')} />
                </nav>
                <main>{screens[currentScreen] || <RosterScreen roster={roster} setRoster={setRoster} />}</main>
                 <footer className="text-center mt-12 text-xs text-gray-500 tracking-widest"><p>ULTIMATE STATS v1.9</p></footer>
            </div>
        </div>
    );
}

// --- Reusable Components ---
const NavButton = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ease-in-out group ${isActive ? 'bg-cyan-400 text-gray-900 shadow-cyan-400/30 shadow-lg' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}>
        {icon} <span className="font-semibold tracking-wider">{label}</span>
    </button>
);
const PlayerTag = ({ player }) => {
    const genderStyle = player.gender === 'MMP' ? 'bg-blue-500/10' : 'bg-pink-500/10';
    const roleColors = { Handler: 'text-green-400', Cutter: 'text-purple-400', Hybrid: 'text-orange-400' };
    return (<div className={`p-2 rounded-lg flex justify-between items-center ${genderStyle}`}>
        <span className="font-medium text-gray-200">{player.name}</span>
        <span className={`text-xs font-bold ${roleColors[player.role]}`}>{player.role.toUpperCase()}</span>
    </div>);
};
const SwipeButton = ({ onConfirm }) => {
    const [progress, setProgress] = useState(0);
    const [confirmed, setConfirmed] = useState(false);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const handleDragStart = () => { isDragging.current = true; };
    const handleDragEnd = () => { isDragging.current = false; if (progress < 95) setProgress(0); };
    const handleDragMove = (e) => {
        if (!isDragging.current || confirmed || !containerRef.current) return;
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const containerRect = containerRef.current.getBoundingClientRect();
        if(!containerRect.width) return;
        const newProgress = ((clientX - containerRect.left) / containerRect.width) * 100;
        if (newProgress >= 0 && newProgress <= 100) {
            setProgress(newProgress);
            if (newProgress > 95) { setConfirmed(true); onConfirm(); }
        }
    };
    useEffect(() => {
        const moveHandler = (e) => handleDragMove(e);
        const endHandler = () => handleDragEnd();
        document.addEventListener('mousemove', moveHandler); document.addEventListener('mouseup', endHandler);
        document.addEventListener('touchmove', moveHandler); document.addEventListener('touchend', endHandler);
        return () => {
            document.removeEventListener('mousemove', moveHandler); document.removeEventListener('mouseup', endHandler);
            document.removeEventListener('touchmove', moveHandler); document.removeEventListener('touchend', endHandler);
        };
    }, [confirmed]);
    return (
        <div ref={containerRef} className="relative w-full bg-red-900/50 border border-red-500/50 text-white p-3 rounded-lg text-center overflow-hidden touch-none">
            <div className="absolute inset-0 bg-red-600" style={{ width: `${progress}%`, transition: isDragging.current ? 'none' : 'width 0.2s ease-out' }}/>
            <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="absolute top-0 left-0 h-full flex items-center justify-center bg-white text-red-500 rounded-lg cursor-grab active:cursor-grabbing px-4" style={{ transform: `translateX(${progress}%)`, transition: isDragging.current ? 'none' : 'transform 0.2s ease-out' }}>
                <ChevronRight size={24} /><ChevronRight size={24} className="-ml-3" />
            </div>
            <span className="relative z-10 font-bold tracking-wider text-sm">END GAME</span>
        </div>
    );
};
const KdaButton = ({ onClick, children, className = '', disabled = false }) => (
    <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-bold tracking-wider uppercase text-sm border-2 transition-all duration-300 ${className} disabled:bg-gray-700 disabled:border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

// --- Screen Components ---
function RosterScreen({ roster, setRoster, updatePlayer, deletePlayer }) {
    const [showForm, setShowForm] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const handleAddNew = () => { setEditingPlayer(null); setShowForm(true); setShowQuickAdd(false); };
    const handleEdit = (player) => { setEditingPlayer(player); setShowForm(true); setShowQuickAdd(false); };
    const handleSavePlayer = (player) => {
        if (editingPlayer) { updatePlayer(player); }
        else {
            if (roster.find(p => p.name.toLowerCase() === player.name.toLowerCase())) { alert(`Player "${player.name}" already exists.`); return; }
            setRoster(prev => [...prev, { ...player, id: generateId() }]);
        }
        setShowForm(false); setEditingPlayer(null);
    };
    const handleAddMultiplePlayers = (newPlayers) => {
        setRoster(prevRoster => {
            const existingNames = new Set(prevRoster.map(p => p.name.toLowerCase()));
            const trulyNewPlayers = newPlayers.filter(p => !existingNames.has(p.name.toLowerCase()));
            return [...prevRoster, ...trulyNewPlayers];
        });
        setShowQuickAdd(false);
    };
    const loadSavedRoster = () => {
        if(window.confirm("This will replace your current roster with the last saved version. Are you sure?")) {
            const savedRoster = localStorage.getItem('moonlight-roster');
            if (savedRoster) setRoster(JSON.parse(savedRoster));
            else alert("No saved roster found.");
        }
    };
    const clearRoster = () => { if(window.confirm("Are you sure you want to clear the entire roster? This cannot be undone.")) setRoster([]); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-xl font-semibold tracking-wider">Team Roster ({roster.length})</h2>
                <div className="flex items-center space-x-2">
                    <KdaButton onClick={() => {setShowQuickAdd(true); setShowForm(false);}} className="bg-green-500/10 border-green-400 text-green-300 hover:bg-green-400 hover:text-gray-900">Quick Add</KdaButton>
                    <KdaButton onClick={handleAddNew} className="bg-cyan-500/10 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900">Add Player</KdaButton>
                </div>
            </div>
            {showForm && <PlayerForm player={editingPlayer} onSave={handleSavePlayer} onCancel={() => setShowForm(false)} roster={roster}/>}
            {showQuickAdd && <QuickAddRoster onSave={handleAddMultiplePlayers} onCancel={() => setShowQuickAdd(false)} />}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg">
                 <div className="p-4 border-b border-gray-700/50 flex flex-wrap gap-2">
                     <button onClick={loadSavedRoster} className="flex items-center space-x-2 text-xs px-3 py-1 bg-gray-700/80 rounded-md hover:bg-gray-600"><FolderDown size={16} /><span>Load Saved</span></button>
                     <button onClick={clearRoster} className="flex items-center space-x-2 text-xs px-3 py-1 bg-red-900/50 text-red-300 rounded-md hover:bg-red-900"><Eraser size={16} /><span>Clear Roster</span></button>
                </div>
                {roster.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-gray-400 tracking-wider">
                                <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Gender</th><th className="px-6 py-3">Line</th><th className="px-6 py-3">Role</th><th className="px-6 py-3 text-right">Actions</th></tr>
                            </thead>
                            <tbody>
                                {roster.map(player => (
                                    <tr key={player.id} className="border-t border-gray-700/50 hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium">{player.name}</td>
                                        <td className="px-6 py-4">{player.gender}</td><td className="px-6 py-4">{player.line}</td><td className="px-6 py-4">{player.role}</td>
                                        <td className="px-6 py-4 flex items-center justify-end space-x-4">
                                            <button onClick={() => handleEdit(player)} className="text-gray-400 hover:text-yellow-400"><Edit size={16}/></button>
                                            <button onClick={() => deletePlayer(player.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (<p className="p-10 text-center text-gray-500">No players on the roster yet. Add one to get started!</p>)}
            </div>
        </div>
    );
}

function PlayerForm({ player, onSave, onCancel, roster }) {
    const [formData, setFormData] = useState({ name: player?.name || '', gender: player?.gender || 'MMP', line: player?.line || 'Offense', role: player?.role || 'Handler' });
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) { alert("Player name cannot be empty."); return; }
        if (!player && roster.find(p => p.name.toLowerCase() === formData.name.toLowerCase())) { alert(`Player with name "${formData.name}" already exists.`); return; }
        onSave({ ...formData, id: player?.id });
    };
    const inputStyle = "w-full p-3 border-2 border-gray-700 rounded-lg bg-gray-800 focus:border-yellow-400 focus:outline-none focus:ring-0 transition-colors";
    return (
        <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg shadow-lg space-y-6">
            <h3 className="text-lg font-semibold tracking-wider">{player ? 'Edit Player' : 'Add New Player'}</h3>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Player Name" className={inputStyle}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputStyle}> <option>MMP</option> <option>FMP</option> </select>
                <select name="line" value={formData.line} onChange={handleChange} className={inputStyle}> <option>Offense</option> <option>Defense</option> <option>Flex</option> </select>
                <select name="role" value={formData.role} onChange={handleChange} className={inputStyle}> <option>Handler</option> <option>Cutter</option> <option>Hybrid</option> </select>
            </div>
            <div className="flex justify-end space-x-2">
                <KdaButton type="button" onClick={onCancel} className="bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">Cancel</KdaButton>
                <KdaButton type="submit" className="bg-yellow-400/10 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-gray-900">Save</KdaButton>
            </div>
        </form>
    );
}
function QuickAddRoster({ onSave, onCancel }) {
    const [playerInputs, setPlayerInputs] = useState({});
    const handleInputChange = (line, role, gender, value) => { const key = `${line}-${role}-${gender}`; setPlayerInputs(prev => ({ ...prev, [key]: value })); };
    const handleSubmit = () => {
        let allNewPlayers = [];
        for (const key in playerInputs) {
            const [line, role, gender] = key.split('-');
            const names = playerInputs[key].split(',').map(name => name.trim()).filter(name => name.length > 0);
            names.forEach(name => { allNewPlayers.push({ id: generateId(), name, gender, line: line.charAt(0).toUpperCase() + line.slice(1), role: role.charAt(0).toUpperCase() + role.slice(1) }); });
        }
        onSave(allNewPlayers);
    };
    const sections = [ { name: 'Offense', key: 'offense' }, { name: 'Defense', key: 'defense' }, { name: 'Flex', key: 'flex' } ];
    const roles = [ { name: 'Handlers', key: 'handler' }, { name: 'Hybrids', key: 'hybrid' }, { name: 'Cutters', key: 'cutter' } ];

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg shadow-lg space-y-6">
            <h3 className="text-lg font-semibold tracking-wider">Quick Add Players</h3>
            <p className="text-sm text-gray-400">Enter names separated by commas. They will be added with the properties of their section.</p>
            <div className="space-y-6">
                {sections.map(section => (<div key={section.key}><h4 className="font-bold text-md mb-2 border-b-2 border-yellow-400/50 pb-1">{section.name}</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{roles.map(role => (<div key={role.key} className="space-y-3"><h5 className="font-semibold text-sm">{role.name}</h5><div><label className="text-xs text-gray-400">MMP</label><input type="text" placeholder="John, Mike, ..." className="w-full mt-1 p-2 text-sm border-2 border-gray-700 rounded-lg bg-gray-800 focus:border-yellow-400 focus:outline-none" onChange={e => handleInputChange(section.key, role.key, 'MMP', e.target.value)} /></div><div><label className="text-xs text-gray-400">FMP</label><input type="text" placeholder="Sarah, Jess, ..." className="w-full mt-1 p-2 text-sm border-2 border-gray-700 rounded-lg bg-gray-800 focus:border-yellow-400 focus:outline-none" onChange={e => handleInputChange(section.key, role.key, 'FMP', e.target.value)} /></div></div>))}</div></div>))}
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700/50">
                <KdaButton type="button" onClick={onCancel} className="bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">Cancel</KdaButton>
                <KdaButton type="button" onClick={handleSubmit} className="bg-yellow-400/10 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-gray-900">Add Players</KdaButton>
            </div>
        </div>
    );
}

function GameHubScreen({ gameHistory, setGameHistory, onStartNew, onViewGame }) {
    const deleteGame = (gameId) => { if(window.confirm("Are you sure?")) setGameHistory(gameHistory.filter(g => g.id !== gameId)); };
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-xl font-semibold tracking-wider">Game Hub</h2><KdaButton onClick={onStartNew} className="bg-cyan-500/10 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900"><div className="flex items-center space-x-2"><Plus size={16} /><span>New Game</span></div></KdaButton></div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg shadow-lg space-y-4">
                <h3 className="font-bold text-lg tracking-wider">Game History</h3>
                {gameHistory.length > 0 ? (<div className="space-y-3">{gameHistory.map(game => { const won = game.moonlightScore > game.opponentScore; return (<div key={game.id} className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg"><div><p className="font-semibold text-white">vs. {game.opponentName}</p><p className="text-sm text-gray-400"><span className={`font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>{won ? 'W' : 'L'} {game.moonlightScore} - {game.opponentScore}</span> &bull; {new Date(game.startTime).toLocaleDateString()}</p></div><div className="flex items-center space-x-2"><KdaButton onClick={() => onViewGame(game)} className="bg-cyan-500/10 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900 text-xs">View</KdaButton><button onClick={() => deleteGame(game.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16}/></button></div></div>);})}</div>) : (<p className="text-center text-gray-500 py-4">No completed games.</p>)}
            </div>
        </div>
    );
}

function GameSetupScreen({ onStartGame, onBack }) {
    const [initialOffense, setInitialOffense] = useState('Moonlight');
    const [aGender, setAGender] = useState('MMP');
    const [opponentName, setOpponentName] = useState('');
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg shadow-lg space-y-6">
            <div className="flex items-center space-x-2"><button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700"><ArrowLeft size={20} /></button><h2 className="text-xl font-semibold tracking-wider">New Game Setup</h2></div>
             <div><label className="block text-sm font-medium mb-2 text-gray-400">Opponent's Name</label><input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="e.g., Revolver" className="w-full p-3 border-2 border-gray-700 rounded-lg bg-gray-800 focus:border-yellow-400 focus:outline-none"/></div>
            <div><label className="block text-sm font-medium mb-2 text-gray-400">1. Who starts on Offense?</label><div className="flex space-x-2"><button onClick={() => setInitialOffense('Moonlight')} className={`flex-1 p-3 rounded-lg font-semibold tracking-wider ${initialOffense === 'Moonlight' ? 'bg-cyan-400 text-gray-900' : 'bg-gray-700'}`}>Moonlight</button><button onClick={() => setInitialOffense('Opponent')} className={`flex-1 p-3 rounded-lg font-semibold tracking-wider ${initialOffense === 'Opponent' ? 'bg-red-500 text-white' : 'bg-gray-700'}`}>{opponentName || 'Opponent'}</button></div></div>
            <div><label className="block text-sm font-medium mb-2 text-gray-400">2. What is the majority gender ('A')?</label><div className="flex space-x-2"><button onClick={() => setAGender('MMP')} className={`flex-1 p-3 rounded-lg font-semibold tracking-wider ${aGender === 'MMP' ? 'bg-blue-500 text-white' : 'bg-gray-700'}`}>MMP</button><button onClick={() => setAGender('FMP')} className={`flex-1 p-3 rounded-lg font-semibold tracking-wider ${aGender === 'FMP' ? 'bg-pink-500 text-white' : 'bg-gray-700'}`}>FMP</button></div></div>
            <KdaButton onClick={() => onStartGame(initialOffense, aGender, opponentName)} className="w-full bg-green-500/10 border-green-400 text-green-300 hover:bg-green-400 hover:text-gray-900 !py-3">Start Game</KdaButton>
        </div>
    );
}

function LiveGameScreen({ game, setGame, activePointIndex, setActivePointIndex, navigateTo, onEndGame }) {
    const [triggerHalftimeOnNextScore, setTriggerHalftimeOnNextScore] = useState(false);
    
    if (!game) return (<div className="text-center p-6 bg-gray-800/50 rounded-lg"><p>No game selected.</p><button onClick={() => navigateTo('game_hub')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">Go to Game Hub</button></div>);
    const currentPoint = game.points[activePointIndex];
    const updatePointData = (index, data, shouldNotRecalculateScore) => {
        const newPoints = [...game.points]; newPoints[index] = { ...newPoints[index], ...data };
        if (shouldNotRecalculateScore) { setGame({ ...game, points: newPoints }); return; }
        const newMoonlightScore = newPoints.filter(p => p.outcome === 'Moonlight Score').length; const newOpponentScore = newPoints.filter(p => p.outcome === 'Opponent Score').length;
        setGame({ ...game, points: newPoints, moonlightScore: newMoonlightScore, opponentScore: newOpponentScore });
    };
    const handleLineSet = (line) => { updatePointData(activePointIndex, { line }, true); };
    const handleScore = (scorerId, assisterId) => {
        const newMoonlightScore = game.moonlightScore + 1; const newPoints = [...game.points];
        newPoints[activePointIndex] = { ...newPoints[activePointIndex], outcome: 'Moonlight Score', goal: scorerId, assist: assisterId };
        if (newMoonlightScore >= 15) { onEndGame({ ...game, points: newPoints, moonlightScore: newMoonlightScore }, "Score limit reached"); return; }
        let isHalftime = game.isHalftime; 
        if (!isHalftime && (newMoonlightScore >= 8 || game.opponentScore >= 8 || triggerHalftimeOnNextScore)) { 
            isHalftime = true; 
            setTriggerHalftimeOnNextScore(false); // Reset the manual trigger
        }
        const nextPointNumber = game.points.length + 1; const nextAbbaInfo = getAbbaInfoForPoint(nextPointNumber, game.aGender);
        let nextStartingOn = 'Defense'; if (isHalftime && !game.isHalftime) { nextStartingOn = game.initialOffense === 'Moonlight' ? 'Defense' : 'Offense'; }
        const nextPoint = { pointNumber: nextPointNumber, startingOn: nextStartingOn, line: [], outcome: 'In Progress', assist: null, goal: null, abbaInfo: nextAbbaInfo };
        setGame(prevGame => ({ ...prevGame, moonlightScore: newMoonlightScore, points: [...newPoints, nextPoint], isHalftime }));
        setActivePointIndex(game.points.length);
    };
    const handleOpponentScore = () => {
        const newOpponentScore = game.opponentScore + 1; const newPoints = [...game.points];
        newPoints[activePointIndex] = { ...newPoints[activePointIndex], outcome: 'Opponent Score' };
        if (newOpponentScore >= 15) { onEndGame({ ...game, points: newPoints, opponentScore: newOpponentScore }, "Score limit reached"); return; }
        let isHalftime = game.isHalftime; 
        if (!isHalftime && (game.moonlightScore >= 8 || newOpponentScore >= 8 || triggerHalftimeOnNextScore)) { 
            isHalftime = true; 
            setTriggerHalftimeOnNextScore(false); // Reset the manual trigger
        }
        const nextPointNumber = game.points.length + 1; const nextAbbaInfo = getAbbaInfoForPoint(nextPointNumber, game.aGender);
        let nextStartingOn = 'Offense'; if (isHalftime && !game.isHalftime) { nextStartingOn = game.initialOffense === 'Moonlight' ? 'Defense' : 'Offense'; }
        const nextPoint = { pointNumber: nextPointNumber, startingOn: nextStartingOn, line: [], outcome: 'In Progress', assist: null, goal: null, abbaInfo: nextAbbaInfo };
        setGame(prevGame => ({ ...prevGame, opponentScore: newOpponentScore, points: [...newPoints, nextPoint], isHalftime }));
        setActivePointIndex(game.points.length);
    };

    return (
        <div className="space-y-6">
            <div className="p-3 text-center bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-lg font-bold tracking-wider">{game.isComplete ? `VIEWING: vs. ${game.opponentName}` : `LIVE: vs. ${game.opponentName}`}</div>
            <Scoreboard moonlightScore={game.moonlightScore} opponentScore={game.opponentScore} opponentName={game.opponentName} />
            <div className="flex items-center space-x-2 overflow-x-auto p-2 -mx-2">
                {game.points.map((p, index) => (
                    <button key={index} onClick={() => setActivePointIndex(index)} className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${index === activePointIndex ? 'bg-cyan-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>Pt {p.pointNumber}</button>
                ))}
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg shadow-lg"><PointDetails point={currentPoint} pointIndex={activePointIndex} game={game} onLineSet={handleLineSet} onMoonlightScore={handleScore} onOpponentScore={handleOpponentScore} onUpdatePoint={updatePointData} navigateTo={navigateTo} onEndGame={onEndGame} triggerHalftimeOnNextScore={triggerHalftimeOnNextScore} setTriggerHalftimeOnNextScore={setTriggerHalftimeOnNextScore} /></div>
             {game.isComplete && <button onClick={() => navigateTo('game_hub')} className="w-full mt-4 py-3 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-600 tracking-wider">Back to Game Hub</button>}
        </div>
    );
}

// --- Point-level Components ---
const Scoreboard = ({ moonlightScore, opponentScore, opponentName }) => (<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg shadow-lg flex justify-around items-center text-center"><div className="w-1/3"><h3 className="text-lg font-bold text-cyan-400 tracking-widest">MOONLIGHT</h3><p className="text-5xl font-extrabold text-white">{moonlightScore}</p></div><div className="w-1/3 text-2xl font-bold text-gray-600">vs</div><div className="w-1/3"><h3 className="text-lg font-bold text-red-400 tracking-widest">{opponentName.toUpperCase()}</h3><p className="text-5xl font-extrabold text-white">{opponentScore}</p></div></div>);
function PointDetails({ point, pointIndex, game, onLineSet, onMoonlightScore, onOpponentScore, onUpdatePoint, navigateTo, onEndGame, triggerHalftimeOnNextScore, setTriggerHalftimeOnNextScore }) {
    if(!point) return null;
    const abbaLabelStyle = point.abbaInfo.majorityGender === 'MMP' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300';
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700/50">
                <h3 className="text-lg font-semibold tracking-wider">Point {point.pointNumber}</h3>
                <div className="flex items-center space-x-2">
                     <span className={`px-3 py-1 text-sm font-bold rounded-full ${abbaLabelStyle}`}>{point.abbaInfo.label}</span>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${point.startingOn === 'Offense' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{point.startingOn}</span>
                </div>
            </div>
            {point.line.length === 0 && !game.isComplete ? <LineSelector point={point} game={game} onLineSet={onLineSet} navigateTo={navigateTo} onEndGame={onEndGame} /> : <ScoreTracker point={point} pointIndex={pointIndex} game={game} onMoonlightScore={onMoonlightScore} onOpponentScore={onOpponentScore} onUpdatePoint={onUpdatePoint} triggerHalftimeOnNextScore={triggerHalftimeOnNextScore} setTriggerHalftimeOnNextScore={setTriggerHalftimeOnNextScore} />}
        </div>
    );
}

function LineSelector({ point, game, onLineSet, navigateTo, onEndGame }) {
    const [playerToSwap, setPlayerToSwap] = useState(null);
    const [currentLine, setCurrentLine] = useState([]);
    const [lineError, setLineError] = useState('');

    const { requiredMMPs, requiredFMPs } = point.abbaInfo;

    const validateLine = (line) => {
        if (!line || line.length === 0) return `Fatal: Roster lacks eligible players.`;
        if (line.length < 7) return `Fatal: Line must have 7 players. Current: ${line.length}.`;
        const mmpCount = line.filter(p => p.gender === 'MMP').length;
        if (mmpCount !== requiredMMPs) return `Fatal: Gender ratio invalid. Required: ${requiredMMPs} MMPs, Found: ${mmpCount}.`;
        const handlerCount = line.filter(p => p.role === 'Handler' || p.role === 'Hybrid').length;
        if(handlerCount < 3) return `Warning: Line has only ${handlerCount} handlers/hybrids. Minimum is 3.`
        return '';
    };

    useEffect(() => {
        const eligiblePlayers = game.roster.filter(p => p.line === point.startingOn || p.line === 'Flex');
        const playersWithPlaytime = eligiblePlayers.map(p => ({ ...p, pointsPlayed: game.points.filter(pt => pt.line.some(lp => lp.id === p.id)).length })).sort((a, b) => a.pointsPlayed - b.pointsPlayed);
        const mmpPool = playersWithPlaytime.filter(p => p.gender === 'MMP');
        const fmpPool = playersWithPlaytime.filter(p => p.gender === 'FMP');
        if (mmpPool.length < requiredMMPs || fmpPool.length < requiredFMPs) { setLineError(`Fatal: Roster lacks players for ${requiredMMPs} MMPs & ${requiredFMPs} FMPs.`); setCurrentLine([]); return; }
        let suggested = [];
        const mmpSelection = mmpPool.slice(0, requiredMMPs); const fmpSelection = fmpPool.slice(0, requiredFMPs);
        const combinedPool = [...mmpSelection, ...fmpSelection];
        let handlers = combinedPool.filter(p => p.role === 'Handler');
        let hybrids = combinedPool.filter(p => p.role === 'Hybrid');
        let cutters = combinedPool.filter(p => p.role === 'Cutter');
        let handlersNeeded = 3;
        suggested.push(...handlers.splice(0, handlersNeeded));
        handlersNeeded -= suggested.length;
        if (handlersNeeded > 0) suggested.push(...hybrids.splice(0, handlersNeeded));
        const remainingSpots = 7 - suggested.length;
        suggested.push(...cutters.splice(0, remainingSpots));
        if (suggested.length < 7) suggested.push(...hybrids.splice(0, 7 - suggested.length));
        setCurrentLine(suggested);
        setLineError(validateLine(suggested));
    }, [point, game]);

    const handleSwap = (replacementPlayer) => {
        const newLine = currentLine.map(p => p.id === playerToSwap.id ? replacementPlayer : p);
        setCurrentLine(newLine);
        setLineError(validateLine(newLine));
        setPlayerToSwap(null);
    };
    const handleConfirmLine = () => {
        const finalError = validateLine(currentLine);
        if (finalError.startsWith('Warning')) { if (!window.confirm(finalError + "\n\nDo you want to proceed anyway?")) return; }
        else if (finalError) { alert(finalError); return; }
        onLineSet(currentLine);
    };
    const getPlaytime = (playerId) => game.points.filter(pt => pt.line.some(lp => lp.id === playerId)).length;

    if (playerToSwap) {
        const availableReplacements = game.roster.filter(p => !currentLine.find(onField => onField.id === p.id) && p.gender === playerToSwap.gender);
        return (
            <div className="space-y-4">
                 <h4 className="font-semibold">Swap <span className="text-cyan-400">{playerToSwap.name}</span> <span className="text-xs text-gray-500">(Played: {getPlaytime(playerToSwap.id)})</span> with:</h4>
                 <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableReplacements.length > 0 ? availableReplacements.map(player => (<button key={player.id} onClick={() => handleSwap(player)} className="w-full text-left flex justify-between items-center p-2 bg-gray-800 rounded-md hover:bg-gray-700"><div>{player.name} <span className="text-xs text-gray-400">({player.role})</span></div><span className="text-xs font-semibold text-gray-500">Played: {getPlaytime(player.id)}</span></button>)) : <p className="text-gray-500 text-center p-4">No available replacements with matching gender.</p>}
                 </div>
                 <KdaButton onClick={() => setPlayerToSwap(null)} className="w-full bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">Cancel</KdaButton>
            </div>
        )
    }

    const isFatalError = lineError && !lineError.startsWith('Warning');

    return (
        <div className="space-y-6">
            <h4 className="font-semibold tracking-wider">Line for Point {point.pointNumber}:</h4>
            {currentLine.length > 0 ? (<div className="space-y-2">{currentLine.map(player => (<div key={player.id} className="bg-gray-800 border border-gray-700/80 rounded-lg flex justify-between items-center p-2">
                <span className="font-medium">{player.name}</span><span className="text-xs text-gray-500 ml-2">{player.gender} / {player.role}</span>
            <button onClick={() => setPlayerToSwap(player)} className="ml-2 px-3 py-1 text-sm rounded-md bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 hover:bg-yellow-400 hover:text-gray-900 transition-colors">Swap</button></div>))}</div>) : null }
            {isFatalError && (<div className="text-center p-3 bg-red-900/50 border border-red-500/50 rounded-lg"><p className="font-semibold text-red-400">{lineError}</p>{lineError.includes("Roster lacks") && <button onClick={() => navigateTo('roster')} className="mt-2 px-3 py-1 text-sm bg-red-500 text-white rounded-lg shadow">Go to Roster</button>}</div>)}
            {lineError && lineError.startsWith('Warning') && (<div className="text-center p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-lg"><p className="font-semibold text-yellow-400">{lineError}</p></div>)}
            <div className="flex space-x-2 pt-4 border-t border-gray-700/50">
                <div className="w-2/5"><SwipeButton onConfirm={() => onEndGame(game, "Ended manually")} /></div>
                <KdaButton onClick={handleConfirmLine} className="w-3/5 !py-3 bg-cyan-500/10 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900" disabled={isFatalError}>Confirm Line</KdaButton>
            </div>
        </div>
    );
}

function ScoreTracker({ point, pointIndex, game, onMoonlightScore, onOpponentScore, onUpdatePoint, triggerHalftimeOnNextScore, setTriggerHalftimeOnNextScore }) {
    const [selectedGoal, setSelectedGoal] = useState(point.goal);
    const [selectedAssist, setSelectedAssist] = useState(point.assist);
    const [isEditing, setIsEditing] = useState(false);
    const isCurrentPoint = !game.isComplete && point.outcome === 'In Progress';
    useEffect(() => { setSelectedGoal(point.goal); setSelectedAssist(point.assist); }, [point]);

    const handleSelect = (playerId, type) => {
        if (!isCurrentPoint && !isEditing) return;
        if (type === 'goal') { setSelectedGoal(prev => prev === playerId ? null : playerId); if (selectedAssist === playerId) setSelectedAssist(null); }
        else { setSelectedAssist(prev => prev === playerId ? null : playerId); if (selectedGoal === playerId) setSelectedGoal(null); }
    };
    const handleConfirmScore = () => { if (!selectedGoal || !selectedAssist) { alert("Please select both a Goal and an Assist."); return; } onMoonlightScore(selectedGoal, selectedAssist); };
    const handleSaveChanges = () => { if (!selectedGoal || !selectedAssist) { alert("Please select both a Goal and an Assist to save."); return; } onUpdatePoint(pointIndex, { goal: selectedGoal, assist: selectedAssist }, true); setIsEditing(false); }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold tracking-wider">Players on Field:</h4>
                {!isCurrentPoint && point.outcome === 'Moonlight Score' && (<button onClick={() => setIsEditing(!isEditing)} className="flex items-center space-x-1 text-sm text-yellow-400 hover:text-yellow-300">{isEditing ? <X size={16}/> : <Edit size={16}/>}<span>{isEditing ? 'Cancel' : 'Edit'}</span></button>)}
            </div>
             <div className="grid grid-cols-1 gap-2">
                {point.line.map(player => (
                    <div key={player.id} className="bg-gray-800 border border-gray-700/80 rounded-lg flex justify-between items-center p-2">
                        <span className="font-medium">{player.name}</span>
                        {(isCurrentPoint || isEditing) ? (
                             <div className="flex space-x-2">
                                <button onClick={() => handleSelect(player.id, 'assist')} className={`px-4 py-2 text-sm rounded-lg ${selectedAssist === player.id ? 'bg-green-400 text-gray-900 font-bold' : 'bg-gray-700'}`}>Assist</button>
                                <button onClick={() => handleSelect(player.id, 'goal')} className={`px-4 py-2 text-sm rounded-lg ${selectedGoal === player.id ? 'bg-yellow-400 text-gray-900 font-bold' : 'bg-gray-700'}`}>Goal</button>
                            </div>
                        ) : (
                             <div className="flex space-x-2">
                                {point.assist === player.id && <span className="px-3 py-1 text-sm font-bold text-green-300 bg-green-500/20 rounded-full">ASSIST</span>}
                                {point.goal === player.id && <span className="px-3 py-1 text-sm font-bold text-yellow-300 bg-yellow-500/20 rounded-full">GOAL</span>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {isCurrentPoint && (
                <div className="pt-4 border-t border-gray-700/50">
                    {/* Manual Halftime Checkbox */}
                    {!game.isHalftime && (
                        <div className="mb-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={triggerHalftimeOnNextScore} 
                                    onChange={(e) => setTriggerHalftimeOnNextScore(e.target.checked)}
                                    className="w-4 h-4 text-yellow-400 bg-gray-700 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                                />
                                <span className="text-sm font-medium text-gray-300">
                                    Next score will trigger halftime
                                </span>
                            </label>
                        </div>
                    )}
                    
                    {/* Scoring Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <KdaButton onClick={handleConfirmScore} className="!py-3 bg-green-500/10 border-green-400 text-green-300 hover:bg-green-400 hover:text-gray-900" disabled={!selectedGoal || !selectedAssist}>Moonlight Score</KdaButton>
                        <KdaButton onClick={onOpponentScore} className="!py-3 bg-red-500/10 border-red-400 text-red-300 hover:bg-red-400 hover:text-white">Opponent Scored</KdaButton>
                    </div>
                </div>
            )}
            {isEditing && (<div className="pt-4 border-t border-gray-700/50"><KdaButton onClick={handleSaveChanges} className="w-full !py-3 bg-yellow-400/10 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-gray-900">Save Changes</KdaButton></div>)}
            {point.outcome !== 'In Progress' && !isCurrentPoint && !isEditing && (<div className="p-4 text-center bg-gray-900 rounded-lg"><p className="font-bold text-lg tracking-wider">{point.outcome === 'Moonlight Score' ? `Moonlight Scored!` : `${game.opponentName} Scored`}</p></div>)}
        </div>
    );
}

function StatsScreen({ roster, gameHistory, onBack }) {
    const [selectedGameId, setSelectedGameId] = useState('tournament');
    const [filters, setFilters] = useState({ gender: 'All', role: 'All' });
    const [sortBy, setSortBy] = useState({ key: 'pointsPlayed', direction: 'desc' });

    const statsData = useMemo(() => {
        const isTournamentView = selectedGameId === 'tournament';
        const sourceGames = isTournamentView ? gameHistory : gameHistory.filter(g => g.id === selectedGameId);
        if (sourceGames.length === 0) return [];
        const playerPool = isTournamentView ? roster : sourceGames[0].roster;

        return playerPool.map(player => {
            let pointsPlayedList = [];
            sourceGames.forEach(g => { pointsPlayedList.push(...g.points.filter(p => p.line.some(lp => lp.id === player.id) && p.outcome !== 'In Progress')); });
            const pointsPlayed = pointsPlayedList.length;
            const goals = sourceGames.reduce((acc, g) => acc + g.points.filter(p => p.goal === player.id).length, 0);
            const assists = sourceGames.reduce((acc, g) => acc + g.points.filter(p => p.assist === player.id).length, 0);
            const oPoints = pointsPlayedList.filter(p => p.startingOn === 'Offense');
            const dPoints = pointsPlayedList.filter(p => p.startingOn === 'Defense');
            const holds = oPoints.filter(p => p.outcome === 'Moonlight Score').length;
            const breaks = dPoints.filter(p => p.outcome === 'Moonlight Score').length;
            const holdPct = oPoints.length > 0 ? (holds / oPoints.length) * 100 : 0;
            const breakPct = dPoints.length > 0 ? (breaks / dPoints.length) * 100 : 0;
            return { ...player, pointsPlayed, goals, assists, holdPct, breakPct };
        });
    }, [selectedGameId, gameHistory, roster]);

    const filteredAndSortedData = useMemo(() => {
        let data = [...statsData];
        if (filters.gender !== 'All') data = data.filter(p => p.gender === filters.gender);
        if (filters.role !== 'All') data = data.filter(p => p.role === filters.role);
        data.sort((a, b) => { if (a[sortBy.key] < b[sortBy.key]) return sortBy.direction === 'asc' ? -1 : 1; if (a[sortBy.key] > b[sortBy.key]) return sortBy.direction === 'asc' ? 1 : -1; return 0; });
        return data;
    }, [statsData, filters, sortBy]);

    const handleSort = (key) => { if(sortBy.key === key) { setSortBy({ key, direction: sortBy.direction === 'asc' ? 'desc' : 'asc' }); } else { setSortBy({ key, direction: 'desc' }); } };
    const FilterControl = ({ name, options, value, onChange }) => ( <select name={name} value={value} onChange={e => onChange(name, e.target.value)} className="w-full p-3 border-2 border-gray-700 rounded-lg bg-gray-800 focus:border-yellow-400 focus:outline-none"> {options.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> );
    const currentGame = gameHistory.find(g => g.id === selectedGameId);
    const title = selectedGameId === 'tournament' ? "Tournament Stats" : `Game vs. ${currentGame?.opponentName || ''}`;

    return (
        <div className="space-y-6">
             <div className="flex items-center space-x-2"><h2 className="text-xl font-semibold tracking-wider">{title}</h2></div>
            <div className="flex flex-wrap gap-2 p-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg">
                <button onClick={() => setSelectedGameId('tournament')} className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedGameId === 'tournament' ? 'bg-cyan-400 text-gray-900 font-semibold' : 'bg-gray-700/50 text-gray-300'}`}>Tournament Totals</button>
                {gameHistory.map(g => (<button key={g.id} onClick={() => setSelectedGameId(g.id)} className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedGameId === g.id ? 'bg-cyan-400 text-gray-900 font-semibold' : 'bg-gray-700/50 text-gray-300'}`}>vs. {g.opponentName}</button>))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg">
                 <FilterControl name="gender" value={filters.gender} onChange={(k,v) => setFilters({...filters, [k]:v})} options={['All', 'MMP', 'FMP']} />
                 <FilterControl name="role" value={filters.role} onChange={(k,v) => setFilters({...filters, [k]:v})} options={['All', 'Handler', 'Cutter', 'Hybrid']} />
            </div>
             <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-gray-400 tracking-wider">
                           <tr>{['name', 'pointsPlayed', 'goals', 'assists', 'holdPct', 'breakPct'].map(key => ( <th key={key} className="px-6 py-3 cursor-pointer" onClick={() => handleSort(key)}>{key.replace('Pct', ' %').replace(/([A-Z])/g, ' $1')} {sortBy.key === key ? (sortBy.direction === 'asc' ? '▲' : '▼') : ''}</th> ))}</tr>
                        </thead>
                         <tbody>
                            {filteredAndSortedData.map(player => (
                                <tr key={player.id} className="border-t border-gray-700/50 hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium">{player.name}</td><td className="px-6 py-4">{player.pointsPlayed}</td><td className="px-6 py-4">{player.goals}</td>
                                    <td className="px-6 py-4">{player.assists}</td><td className="px-6 py-4">{player.holdPct.toFixed(0)}%</td><td className="px-6 py-4">{player.breakPct.toFixed(0)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    );
}
