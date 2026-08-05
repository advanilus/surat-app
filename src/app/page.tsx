'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Mail, Plus, Inbox, Send, Calendar, Tag, Search,
  FileText, Paperclip, Download, Printer, Trash2, Edit2, X, BarChart3, LayoutDashboard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Letter {
  id: number;
  type: 'MASUK' | 'KELUAR';
  letter_number: string;
  subject: string;
  sender: string;
  recipient: string;
  letter_date: string;
  file_path?: string;
  created_at: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda'>('agenda');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<'MASUK' | 'KELUAR'>('MASUK');
  const [letterNumber, setLetterNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil data dari API & Normalisasi Kolom Supabase
  const fetchLetters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/letters');
      const json = await res.json();
      
      if (json.success && Array.isArray(json.data)) {
        // Mapping kolom database Supabase ke struktur interface frontend
        const normalizedData: Letter[] = json.data.map((item: any) => ({
          id: item.id,
          type: (item.kategori || item.type || 'MASUK').toString().toUpperCase() as 'MASUK' | 'KELUAR',
          letter_number: item.nomor_surat || item.letter_number || '',
          subject: item.perihal || item.subject || '',
          sender: item.pengirim || item.sender || '',
          recipient: item.penerima || item.recipient || '',
          letter_date: item.created_at ? item.created_at.split('T')[0] : (item.letter_date || new Date().toISOString().split('T')[0]),
          file_path: item.file_url || item.file_path || '',
          created_at: item.created_at || '',
        }));
        setLetters(normalizedData);
      }
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  // Submit Simpan / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    // Kirim kunci bahasa Indonesia & Inggris agar kompatibel penuh dengan API backend
    formData.append('type', type);
    formData.append('kategori', type);
    formData.append('letter_number', letterNumber);
    formData.append('nomor_surat', letterNumber);
    formData.append('subject', subject);
    formData.append('perihal', subject);
    formData.append('sender', sender);
    formData.append('pengirim', sender);
    formData.append('recipient', recipient);
    formData.append('penerima', recipient);
    formData.append('letter_date', letterDate);
    
    if (file) formData.append('file', file);

    try {
      const url = editingId ? `/api/letters/${editingId}` : '/api/letters';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });
      const json = await res.json();

      if (json.success) {
        resetForm();
        fetchLetters();
      } else {
        alert(json.error || 'Terjadi kesalahan saat menyimpan surat');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Gagal menghubungkan ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Modal Edit
  const handleEdit = (letter: Letter) => {
    setEditingId(letter.id);
    setType(letter.type);
    setLetterNumber(letter.letter_number || '');
    setSubject(letter.subject || '');
    setSender(letter.sender || '');
    setRecipient(letter.recipient || '');
    setLetterDate(letter.letter_date || new Date().toISOString().split('T')[0]);
    setFile(null);
  };

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setLetterNumber('');
    setSubject('');
    setSender('');
    setRecipient('');
    setFile(null);
    setLetterDate(new Date().toISOString().split('T')[0]);
  };

  // Hapus Surat
  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus surat ini beserta lampirannya?')) return;

    try {
      const res = await fetch(`/api/letters/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchLetters();
      else alert(json.error || 'Gagal menghapus data');
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  // Export ke Excel (CSV)
  const exportCSV = () => {
    const headers = ['ID', 'Jenis', 'Nomor Surat', 'Perihal', 'Pengirim', 'Penerima', 'Tanggal Surat'];
    const rows = filteredLetters.map((l) => [
      l.id,
      l.type,
      `"${l.letter_number || ''}"`,
      `"${l.subject || ''}"`,
      `"${l.sender || ''}"`,
      `"${l.recipient || ''}"`,
      l.letter_date,
    ]);

    // Tambahkan \uFEFF (UTF-8 BOM) agar format dibaca sempurna oleh Microsoft Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_agenda_surat_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Data Surat
  const filteredLetters = letters.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesSearch =
      (item.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.letter_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.sender || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.recipient || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Statistik Dashboard
  const stats = useMemo(() => {
    const total = letters.length;
    const masuk = letters.filter((l) => l.type === 'MASUK').length;
    const keluar = letters.filter((l) => l.type === 'KELUAR').length;

    // Olah data bulanan untuk grafik
    const monthlyData: Record<string, { month: string; MASUK: number; KELUAR: number }> = {};
    letters.forEach((l) => {
      let monthLabel = 'Lainnya';
      if (l.letter_date) {
        const d = new Date(l.letter_date);
        if (!isNaN(d.getTime())) {
          monthLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' }); // Contoh: "Jan 26"
        }
      }
      
      if (!monthlyData[monthLabel]) {
        monthlyData[monthLabel] = { month: monthLabel, MASUK: 0, KELUAR: 0 };
      }
      monthlyData[monthLabel][l.type]++;
    });

    const chartData = Object.values(monthlyData);
    return { total, masuk, keluar, chartData };
  }, [letters]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Navigasi Tab */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-7 h-7 text-blue-600" />
              Sistem Agenda Surat Kantor
            </h1>
            <p className="text-slate-500 text-sm mt-1">Pencatatan, grafik statistik, dan arsip berkas digital</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'agenda' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" /> Agenda Surat
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD STATISTIK */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Cards Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Surat Agenda</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileText className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Surat Masuk</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.masuk}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Inbox className="w-6 h-6" /></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Surat Keluar</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.keluar}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Send className="w-6 h-6" /></div>
              </div>
            </div>

            {/* Grafik Recharts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" /> Grafik Volume Surat Per Bulan
              </h3>
              <div className="h-72 w-full">
                {stats.chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Belum ada data grafik</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="MASUK" name="Surat Masuk" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="KELUAR" name="Surat Keluar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENDA SURAT (FORM & TABEL) */}
        {activeTab === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Form Input / Edit Surat */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit print:hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  {editingId ? <Edit2 className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-blue-600" />}
                  {editingId ? 'Edit Data Surat' : 'Catat Surat Baru'}
                </h2>
                {editingId && (
                  <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Switch Tipe */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Jenis Surat</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('MASUK')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-medium text-xs transition ${
                        type === 'MASUK' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <Inbox className="w-4 h-4" /> Surat Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('KELUAR')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-medium text-xs transition ${
                        type === 'KELUAR' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <Send className="w-4 h-4" /> Surat Keluar
                    </button>
                  </div>
                </div>

                {/* Nomor Surat */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nomor Surat</label>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Nomor Surat"
                      value={letterNumber}
                      onChange={(e) => setLetterNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Perihal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Perihal / Subjek</label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Perihal Surat"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Pengirim & Penerima */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pengirim</label>
                    <input
                      type="text"
                      placeholder="Pengirim"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Penerima</label>
                    <input
                      type="text"
                      placeholder="Penerima"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Tanggal Surat */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Surat</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      value={letterDate}
                      onChange={(e) => setLetterDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Lampiran Berkas (PDF / Foto)</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 text-white font-medium text-sm rounded-lg transition shadow-sm ${
                    editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Simpan Data Surat'}
                </button>
              </form>
            </div>

            {/* Tabel Agenda Surat */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Action Bar (Search, Filter, Export, Print) */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-center print:hidden">
                <div className="relative w-full sm:w-auto flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor, perihal, atau pengirim..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Filter Status */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'ALL' | 'MASUK' | 'KELUAR')}
                    className="py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700"
                  >
                    <option value="ALL">Semua Surat</option>
                    <option value="MASUK">Surat Masuk</option>
                    <option value="KELUAR">Surat Keluar</option>
                  </select>

                  <button
                    onClick={exportCSV}
                    className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition"
                    title="Export ke Excel (CSV)"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-2 text-slate-600 hover:text-blue-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition"
                    title="Cetak Agenda / Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tampilan Cetak Header */}
              <div className="hidden print:block text-center mb-6">
                <h2 className="text-xl font-bold uppercase">REKAP AGENDA SURAT MASUK & SURAT KELUAR</h2>
                <p className="text-sm">Dicetak Pada: {new Date().toLocaleDateString('id-ID')}</p>
              </div>

              {/* List / Tabel Surat */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Memuat data agenda...</div>
                ) : filteredLetters.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Tidak ada data surat ditemukan.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredLetters.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                item.type === 'MASUK' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.type}
                            </span>
                            <span className="text-xs font-mono font-semibold text-slate-700">
                              {item.letter_number || 'Tanpa Nomor'}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-800 text-sm">{item.subject}</h4>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                            <span>Dari: <strong className="text-slate-700">{item.sender || '-'}</strong></span>
                            <span>Kepada: <strong className="text-slate-700">{item.recipient || '-'}</strong></span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3 h-3" /> {item.letter_date}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 print:hidden">
                          {item.file_path && (
                            <a
                              href={item.file_path}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition"
                              title="Lihat Lampiran Berkas"
                            >
                              <Paperclip className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition"
                            title="Edit Data"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}