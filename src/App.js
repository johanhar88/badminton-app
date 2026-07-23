import React, { useState, useEffect } from 'react';

// Bobot angka untuk 4 level
const LEVEL_WEIGHTS = {
  'Advanced': 4,
  'Intermediate': 3,
  'Amateur': 2,
  'Beginner': 1
};
const LEVELS = Object.keys(LEVEL_WEIGHTS);

export default function BadmintonMatchMaker() {
  // --- INISIALISASI STATE DARI LOCAL STORAGE (JIKA ADA) ---
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('badminton_players');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [numCourts, setNumCourts] = useState(() => {
    const saved = localStorage.getItem('badminton_numCourts');
    return saved ? JSON.parse(saved) : 1;
  });
  
  const [matchType, setMatchType] = useState(() => {
    const saved = localStorage.getItem('badminton_matchType');
    return saved ? JSON.parse(saved) : 'double';
  });
  
  const [activeMatches, setActiveMatches] = useState(() => {
    const saved = localStorage.getItem('badminton_activeMatches');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [matchHistory, setMatchHistory] = useState(() => {
    const saved = localStorage.getItem('badminton_history');
    return saved ? JSON.parse(saved) : [];
  });

  // State input form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState('Beginner');
  const [newPlayerGender, setNewPlayerGender] = useState('L'); 

  // State untuk menandai slot kosong & partner pernah main bareng
  const [emptySlots, setEmptySlots] = useState({});
  const [partnerWarnings, setPartnerWarnings] = useState({});

  // --- EFEK: SIMPAN OTOMATIS KE LOCAL STORAGE SAAT DATA BERUBAH ---
  useEffect(() => {
    localStorage.setItem('badminton_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('badminton_numCourts', JSON.stringify(numCourts));
  }, [numCourts]);

  useEffect(() => {
    localStorage.setItem('badminton_matchType', JSON.stringify(matchType));
  }, [matchType]);

  useEffect(() => {
    localStorage.setItem('badminton_activeMatches', JSON.stringify(activeMatches));
  }, [activeMatches]);

  useEffect(() => {
    localStorage.setItem('badminton_history', JSON.stringify(matchHistory));
  }, [matchHistory]);


  // --- HELPER VISUAL UI ---
  const renderGenderBadge = (gender) => {
    const isMale = gender === 'L';
    return (
      <span className={`inline-flex items-center justify-center font-black text-[10px] w-5 h-5 rounded ${
        isMale ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
      }`} title={isMale ? "Laki-laki" : "Perempuan"}>
        {gender}
      </span>
    );
  };

  // --- LOGIKA MANAJEMEN PEMAIN & VALIDASI NAMA ---
  const addPlayer = (e) => {
    e.preventDefault();
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) return;

    const isDuplicate = players.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      alert(`Pemain dengan nama "${trimmedName}" sudah terdaftar di dalam list!`);
      return;
    }

    setPlayers([
      ...players, 
      { 
        id: Date.now().toString(), 
        name: trimmedName, 
        level: newPlayerLevel, 
        gender: newPlayerGender, 
        matchesPlayed: 0 
      }
    ]);
    setNewPlayerName('');
  };

  const removePlayer = (id) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const updatePlayerLevel = (id, newLevel) => {
    setPlayers(players.map((p) => p.id === id ? { ...p, level: newLevel } : p));
  };

  // --- LOGIKA AUTOFILL: PEMILIHAN & PEMBAGIAN TIM YANG ADIL BERDASARKAN LEVEL ---
  const generateMatches = () => {
    const playersNeeded = numCourts * (matchType === 'double' ? 4 : 2);

    // 1. Urutkan berdasarkan frekuensi main paling sedikit (agar adil giliran bermain)
    const sortedByPlayed = [...players].sort((a, b) => {
      if (a.matchesPlayed === b.matchesPlayed) return Math.random() - 0.5;
      return a.matchesPlayed - b.matchesPlayed;
    });

    // Ambil sejumlah pemain yang dibutuhkan untuk lapangan aktif
    const selectedPlayers = sortedByPlayed.slice(0, playersNeeded);

    // 2. Bagi pemain menjadi 2 kelompok berdasarkan rating level (Atas & Bawah)
    // Ini bertujuan agar tim tidak jompang (misal: semua master di 1 tim)
    const highLevelPlayers = selectedPlayers.filter(p => LEVEL_WEIGHTS[p.level] >= 3); // Advanced & Intermediate
    const lowLevelPlayers = selectedPlayers.filter(p => LEVEL_WEIGHTS[p.level] < 3);   // Amateur & Beginner

    // Acak internal dalam kelompok masing-masing agar variasinya dinamis
    highLevelPlayers.sort(() => Math.random() - 0.5);
    lowLevelPlayers.sort(() => Math.random() - 0.5);

    // Gabungkan kembali dengan komposisi selang-seling/seimbang
    const balancedPool = [];
    let hi = 0, lo = 0;
    while (hi < highLevelPlayers.length || lo < lowLevelPlayers.length) {
      if (hi < highLevelPlayers.length) balancedPool.push(highLevelPlayers[hi++]);
      if (lo < lowLevelPlayers.length) balancedPool.push(lowLevelPlayers[lo++]);
    }

    const newMatches = [];
    let pIdx = 0;

    for (let i = 0; i < numCourts; i++) {
      if (matchType === 'double') {
        // Untuk double (4 pemain: A, B vs C, D)
        // Agar adil kekuatannya: Tim 1 (Pemain urutan ke-1 & ke-4), Tim 2 (Pemain urutan ke-2 & ke-3)
        const p1 = balancedPool[pIdx++] || null;
        const p2 = balancedPool[pIdx++] || null;
        const p3 = balancedPool[pIdx++] || null;
        const p4 = balancedPool[pIdx++] || null;

        newMatches.push({
          court: i + 1,
          team1: [p1, p4],
          team2: [p2, p3],
        });
      } else {
        // Untuk single (2 pemain: A vs B)
        const p1 = balancedPool[pIdx++] || null;
        const p2 = balancedPool[pIdx++] || null;

        newMatches.push({
          court: i + 1,
          team1: [p1],
          team2: [p2],
        });
      }
    }

    // --- CEK APAKAH ADA PASANGAN TIM YANG PERNAH MAIN BARENG DI HISTORY ---
    const newWarnings = {};
    const repeatPairs = [];
    const pastPartners = new Set();
    
    matchHistory.forEach(record => {
      record.matches.forEach(m => {
        if (m.team1.length === 2 && m.team1[0] && m.team1[1]) {
          const ids = [m.team1[0].id, m.team1[1].id].sort();
          pastPartners.add(`${ids[0]}-${ids[1]}`);
        }
        if (m.team2.length === 2 && m.team2[0] && m.team2[1]) {
          const ids = [m.team2[0].id, m.team2[1].id].sort();
          pastPartners.add(`${ids[0]}-${ids[1]}`);
        }
      });
    });

    newMatches.forEach((m, cIdx) => {
      if (m.team1.length === 2 && m.team1[0] && m.team1[1]) {
        const ids = [m.team1[0].id, m.team1[1].id].sort();
        if (pastPartners.has(`${ids[0]}-${ids[1]}`)) {
          repeatPairs.push(`Lapangan ${m.court} (Tim 1): ${m.team1[0].name} & ${m.team1[1].name}`);
          newWarnings[`${cIdx}-1-0`] = true;
          newWarnings[`${cIdx}-1-1`] = true;
        }
      }
      if (m.team2.length === 2 && m.team2[0] && m.team2[1]) {
        const ids = [m.team2[0].id, m.team2[1].id].sort();
        if (pastPartners.has(`${ids[0]}-${ids[1]}`)) {
          repeatPairs.push(`Lapangan ${m.court} (Tim 2): ${m.team2[0].name} & ${m.team2[1].name}`);
          newWarnings[`${cIdx}-2-0`] = true;
          newWarnings[`${cIdx}-2-1`] = true;
        }
      }
    });

    setActiveMatches(newMatches);
    setEmptySlots({});
    setPartnerWarnings(newWarnings);

    if (repeatPairs.length > 0) {
      alert(`⚠️ PERINGATAN PASANGAN BERULANG:\nBerikut adalah pemain yang pernah berada di 1 tim yang sama sebelumnya:\n\n• ${repeatPairs.join('\n• ')}\n\n(Kotak ditandai warna kuning. Silakan ubah secara manual jika diinginkan).`);
    }
  };

  // --- LOGIKA MANUAL OVERRIDE & CLEAR SLOT ---
  const handleManualOverride = (courtIndex, teamIndex, playerIndex, newPlayerId) => {
    const slotKey = `${courtIndex}-${teamIndex}-${playerIndex}`;
    if (emptySlots[slotKey] || partnerWarnings[slotKey]) {
      const updatedEmpty = { ...emptySlots };
      const updatedWarn = { ...partnerWarnings };
      delete updatedEmpty[slotKey];
      delete updatedWarn[slotKey];
      setEmptySlots(updatedEmpty);
      setPartnerWarnings(updatedWarn);
    }

    if (!newPlayerId) {
      const updatedMatches = [...activeMatches];
      const targetTeam = teamIndex === 1 ? 'team1' : 'team2';
      updatedMatches[courtIndex][targetTeam][playerIndex] = null;
      setActiveMatches(updatedMatches);
      return;
    }

    const isPlayingElsewhere = activeMatches.some((match, cIdx) => {
      if (cIdx === courtIndex) return false;
      const allPlayersInMatch = [...match.team1, ...match.team2];
      return allPlayersInMatch.some(p => p && p.id === newPlayerId);
    });

    if (isPlayingElsewhere) {
      alert("Pemain tersebut sedang bertanding di lapangan lain!");
      return;
    }

    const newPlayer = players.find((p) => p.id === newPlayerId);
    const updatedMatches = [...activeMatches];
    const targetTeam = teamIndex === 1 ? 'team1' : 'team2';
    
    updatedMatches[courtIndex][targetTeam][playerIndex] = newPlayer || null;
    setActiveMatches(updatedMatches);
  };

  // --- LOGIKA SELESAI ---
  const finishMatches = () => {
    if (activeMatches.length === 0) return;
    
    let hasError = false;
    const newEmptySlots = {};

    activeMatches.forEach((match, cIndex) => {
      match.team1.forEach((p, pIndex) => {
        if (!p) {
          newEmptySlots[`${cIndex}-1-${pIndex}`] = true;
          hasError = true;
        }
      });
      match.team2.forEach((p, pIndex) => {
        if (!p) {
          newEmptySlots[`${cIndex}-2-${pIndex}`] = true;
          hasError = true;
        }
      });
    });

    if (hasError) {
      setEmptySlots(newEmptySlots);
      alert(`Masih ada slot pemain yang kosong! Kolom yang berwarna merah wajib diisi.`);
      return;
    }

    const playedIds = [];
    activeMatches.forEach((match) => {
      match.team1.forEach((p) => p && playedIds.push(p.id));
      match.team2.forEach((p) => p && playedIds.push(p.id));
    });

    const updatedPlayers = players.map((p) => 
      playedIds.includes(p.id) ? { ...p, matchesPlayed: p.matchesPlayed + 1 } : p
    );

    const newHistoryRecord = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      matches: [...activeMatches]
    };
    
    setMatchHistory([newHistoryRecord, ...matchHistory]);
    setPlayers(updatedPlayers);
    setActiveMatches([]);
    setEmptySlots({});
    setPartnerWarnings({});
  };

  // --- RESET KESELURUHAN & HAPUS RIWAYAT ---
  const clearHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat pertandingan?')) {
      setMatchHistory([]);
    }
  };

  const resetAllData = () => {
    if (window.confirm('PERINGATAN: Semua data pemain, lapangan, dan riwayat akan dihapus. Lanjutkan?')) {
      setPlayers([]);
      setActiveMatches([]);
      setMatchHistory([]);
      setEmptySlots({});
      setPartnerWarnings({});
      localStorage.clear();
    }
  };

  // --- PEWARNAAN LEVEL ---
  const getLevelColor = (level) => {
    switch (level) {
      case 'Advanced': return 'bg-red-100 text-red-700 border-red-200';
      case 'Intermediate': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Amateur': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Beginner': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // --- FUNGSI URUTKAN DROPDOWN PEMAIN ---
  const getSortedDropdownPlayers = () => {
    return [...players].sort((a, b) => {
      if (a.gender !== b.gender) {
        return a.gender === 'L' ? -1 : 1;
      }
      return LEVEL_WEIGHTS[b.level] - LEVEL_WEIGHTS[a.level];
    });
  };

  // --- HITUNG STATISTIK ARENA ---
  const totalActivePlayersInCourt = activeMatches.reduce((acc, match) => {
    const t1Count = match.team1.filter(p => p !== null).length;
    const t2Count = match.team2.filter(p => p !== null).length;
    return acc + t1Count + t2Count;
  }, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap');
        
        .font-google-sans {
          font-family: 'Google Sans', sans-serif;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-google-sans">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* HEADER */}
          <header className="bg-slate-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3">
                🎾 MatchGrid <span className="text-blue-400 text-sm bg-black px-2 py-1 rounded-lg animate-bounce">Beta Version</span>
              </h1>
              <p className="text-slate-300 mt-1">Raquet Match Generator</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
              <button 
                onClick={resetAllData}
                className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-300 border border-red-500/30 px-3 py-2 rounded-lg text-sm font-bold transition"
                title="Mulai sesi baru (Hapus semua data)"
              >
                🔄 Reset Sesi
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* KOLOM KIRI: SETTING & PEMAIN (Lebar 4/12) */}
            <div className="space-y-6 lg:col-span-4">
              
              {/* PENGATURAN */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                  ⚙️ Pengaturan
                </h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Mode</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      value={matchType} 
                      onChange={(e) => setMatchType(e.target.value)}
                    >
                      <option value="single">Single (1 vs 1)</option>
                      <option value="double">Double (2 vs 2)</option>
                    </select>
                  </div>
                  
                  <div className="w-28">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Lapangan</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-medium cursor-pointer"
                      value={numCourts} 
                      onChange={(e) => setNumCourts(Number(e.target.value))}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* DAFTAR PEMAIN */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    👥 Pemain
                  </h3>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                    Total: {players.length}
                  </span>
                </div>
                
                <form onSubmit={addPlayer} className="flex flex-wrap gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Nama..." 
                    className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                  
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    value={newPlayerGender}
                    onChange={(e) => setNewPlayerGender(e.target.value)}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>

                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-1 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    value={newPlayerLevel}
                    onChange={(e) => setNewPlayerLevel(e.target.value)}
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm w-full mt-1">
                    + Tambah Pemain
                  </button>
                </form>

                <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                  {players.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">Belum ada pemain.</p>
                  ) : (
                    players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl hover:shadow-md transition">
                        
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="bg-slate-100 text-slate-600 text-[11px] font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full" title="Jumlah main">
                            {p.matchesPlayed}
                          </span>
                          {renderGenderBadge(p.gender)}
                          <span className="font-semibold text-slate-700 text-sm truncate max-w-[80px]" title={p.name}>
                            {p.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select 
                            className={`text-[11px] font-bold px-1.5 py-1 border rounded-md cursor-pointer outline-none ${getLevelColor(p.level)}`}
                            value={p.level}
                            onChange={(e) => updatePlayerLevel(p.id, e.target.value)}
                          >
                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <button 
                            onClick={() => removePlayer(p.id)}
                            className="text-slate-300 hover:text-red-500 p-1 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: ARENA PERTANDINGAN & HISTORY (Lebar 8/12) */}
            <div className="space-y-6 lg:col-span-8">
              
              {/* ARENA PERTANDINGAN AKTIF */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">🏟️ Arena Pertandingan</h3>
                    <p className="text-sm text-slate-500">Tim dibagi adil berdasarkan rating pemain.</p>
                  </div>
                  <button 
                    onClick={generateMatches} 
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-md transition flex items-center justify-center gap-2"
                  >
                    🎲 Generate Match
                  </button>
                </div>

                {/* INFORMASI STATISTIK JUMLAH PERTANDINGAN / PEMAIN AKTIF */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Lapangan Aktif</span>
                    <span className="font-bold text-slate-700 text-base">{activeMatches.length} dari {numCourts} Lapangan</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Pemain di Lapangan</span>
                    <span className="font-bold text-blue-600 text-base">{totalActivePlayersInCourt} Pemain</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-xs text-slate-400 block font-semibold uppercase">Total Selesai Sesi Ini</span>
                    <span className="font-bold text-emerald-600 text-base">{matchHistory.length} Sesi Pertandingan</span>
                  </div>
                </div>

                {activeMatches.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <span className="text-4xl opacity-50">🏸</span>
                    <p className="text-sm text-slate-400 mt-3 font-medium">Belum ada pertandingan aktif.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {activeMatches.map((match, cIndex) => (
                      <div key={cIndex} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 text-sm font-bold flex justify-between items-center text-slate-700">
                          <span>LAPANGAN {match.court}</span>
                          <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs shadow-sm">
                            {matchType === 'single' ? 'Single' : 'Double'}
                          </span>
                        </div>
                        
                        <div className="p-5 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                          {/* TIM 1 */}
                          <div className="w-full sm:w-2/5 space-y-3">
                            {match.team1.map((p, pIndex) => {
                              const isSlotEmptyError = emptySlots[`${cIndex}-1-${pIndex}`];
                              const isPartnerWarn = partnerWarnings[`${cIndex}-1-${pIndex}`];

                              let selectStyle = 'bg-slate-50 border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500';
                              if (isSlotEmptyError) {
                                selectStyle = 'bg-red-50 border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-400';
                              } else if (isPartnerWarn) {
                                selectStyle = 'bg-amber-50 border-2 border-amber-400 text-amber-900 focus:ring-2 focus:ring-amber-300';
                              }

                              return (
                                <div key={pIndex} className="flex items-center gap-2">
                                  <select 
                                    value={p ? p.id : ""}
                                    onChange={(e) => handleManualOverride(cIndex, 1, pIndex, e.target.value)}
                                    className={`w-full font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer shadow-sm appearance-none text-sm transition ${selectStyle}`}
                                  >
                                    <option value="" disabled>-- Pilih Pemain --</option>
                                    {getSortedDropdownPlayers().map(player => {
                                      const isPlayingElsewhere = activeMatches.some((m, mIdx) => {
                                        if (mIdx === cIndex) return false;
                                        return [...m.team1, ...m.team2].some(tp => tp && tp.id === player.id);
                                      });

                                      const currentSlotPlayerId = match.team1[pIndex]?.id;
                                      const isAlreadyInThisCourt = [...match.team1, ...match.team2].some(tp => tp && tp.id === player.id);
                                      const isDisabled = isPlayingElsewhere || (isAlreadyInThisCourt && player.id !== currentSlotPlayerId);

                                      return (
                                        <option 
                                          key={player.id} 
                                          value={player.id} 
                                          disabled={isDisabled}
                                        >
                                          {player.name} ({player.gender}) - {player.level} {isPlayingElsewhere ? '🔒 (Di Lapangan Lain)' : (isAlreadyInThisCourt && player.id !== currentSlotPlayerId) ? '🔒 (Sudah Dipilih)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>

                                  <button 
                                    onClick={() => handleManualOverride(cIndex, 1, pIndex, "")}
                                    className="bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 px-3 py-2.5 rounded-xl font-bold text-xs transition border border-slate-200 shrink-0"
                                    title="Kosongkan posisi pemain ini"
                                  >
                                    Clear
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* VS BADGE */}
                          <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 border-4 border-white">
                            VS
                          </div>

                          {/* TIM 2 */}
                          <div className="w-full sm:w-2/5 space-y-3">
                            {match.team2.map((p, pIndex) => {
                              const isSlotEmptyError = emptySlots[`${cIndex}-2-${pIndex}`];
                              const isPartnerWarn = partnerWarnings[`${cIndex}-2-${pIndex}`];

                              let selectStyle = 'bg-slate-50 border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500';
                              if (isSlotEmptyError) {
                                selectStyle = 'bg-red-50 border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-400';
                              } else if (isPartnerWarn) {
                                selectStyle = 'bg-amber-50 border-2 border-amber-400 text-amber-900 focus:ring-2 focus:ring-amber-300';
                              }

                              return (
                                <div key={pIndex} className="flex items-center gap-2">
                                  <select 
                                    value={p ? p.id : ""}
                                    onChange={(e) => handleManualOverride(cIndex, 2, pIndex, e.target.value)}
                                    className={`w-full font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer shadow-sm appearance-none text-sm sm:text-right transition ${selectStyle}`}
                                  >
                                    <option value="" disabled>-- Pilih Pemain --</option>
                                    {getSortedDropdownPlayers().map(player => {
                                      const isPlayingElsewhere = activeMatches.some((m, mIdx) => {
                                        if (mIdx === cIndex) return false;
                                        return [...m.team1, ...m.team2].some(tp => tp && tp.id === player.id);
                                      });

                                      const currentSlotPlayerId = match.team2[pIndex]?.id;
                                      const isAlreadyInThisCourt = [...match.team1, ...match.team2].some(tp => tp && tp.id === player.id);
                                      const isDisabled = isPlayingElsewhere || (isAlreadyInThisCourt && player.id !== currentSlotPlayerId);

                                      return (
                                        <option 
                                          key={player.id} 
                                          value={player.id} 
                                          disabled={isDisabled}
                                        >
                                          {player.name} ({player.gender}) - {player.level} {isPlayingElsewhere ? '🔒 (Di Lapangan Lain)' : (isAlreadyInThisCourt && player.id !== currentSlotPlayerId) ? '🔒 (Sudah Dipilih)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>

                                  <button 
                                    onClick={() => handleManualOverride(cIndex, 2, pIndex, "")}
                                    className="bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 px-3 py-2.5 rounded-xl font-bold text-xs transition border border-slate-200 shrink-0"
                                    title="Kosongkan posisi pemain ini"
                                  >
                                    Clear
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button 
                      onClick={finishMatches} 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-md hover:shadow-lg transition flex justify-center items-center gap-2 mt-4 text-lg"
                    >
                      ✅ Selesaikan Pertandingan
                    </button>
                  </div>
                )}
              </div>

              {/* RIWAYAT PERTANDINGAN (HISTORY) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    📜 Riwayat Selesai
                  </h3>
                  
                  {matchHistory.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-sm font-bold transition"
                    >
                      🗑️ Hapus
                    </button>
                  )}
                </div>

                {matchHistory.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <p className="text-sm text-slate-400 italic">Belum ada pertandingan yang diselesaikan.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {matchHistory.map((historyRecord) => (
                      <div key={historyRecord.id} className="relative pl-5 border-l-4 border-slate-200">
                        
                        <div className="mb-3 absolute -left-2.5 top-0 bg-slate-200 w-4 h-4 rounded-full border-4 border-white"></div>
                        <div className="mb-3">
                          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                            Pukul {historyRecord.time}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {historyRecord.matches.map((m, mIndex) => (
                            <div key={mIndex} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <div className="font-extrabold text-slate-800 text-xs mb-3 bg-slate-200 inline-block px-2 py-1 rounded">
                                LAPANGAN {m.court}
                              </div>
                              
                              <div className="flex flex-col gap-2 text-sm">
                                {/* TEAM 1 */}
                                <div className="font-semibold text-slate-700 flex flex-wrap items-center gap-1.5">
                                  {m.team1.map((p, i) => (
                                    <React.Fragment key={p ? p.id : i}>
                                      {i > 0 && <span className="text-slate-300 mx-0.5">&</span>}
                                      <div className="flex items-center gap-1">
                                        {p ? p.name : 'Kosong'} {p && renderGenderBadge(p.gender)} 
                                        {p && <span className="text-[10px] text-slate-400 bg-white border px-1 rounded">{p.level}</span>}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                                
                                <div className="text-rose-500 font-black text-xs">VS</div>
                                
                                {/* TEAM 2 */}
                                <div className="font-semibold text-slate-700 flex flex-wrap items-center gap-1.5">
                                  {m.team2.map((p, i) => (
                                    <React.Fragment key={p ? p.id : i}>
                                      {i > 0 && <span className="text-slate-300 mx-0.5">&</span>}
                                      <div className="flex items-center gap-1">
                                        {p ? p.name : 'Kosong'} {p && renderGenderBadge(p.gender)} 
                                        {p && <span className="text-[10px] text-slate-400 bg-white border px-1 rounded">{p.level}</span>}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>

                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}