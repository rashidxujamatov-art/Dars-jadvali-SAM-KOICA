import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import './index.css';

const days = [1, 2, 3, 4, 5, 6];
const pairs = [1, 2, 3, 4, 5];

function Crud({ title, model, fields, reloadToken }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});

  const load = async () => setRows(await api(`/${model}`));
  useEffect(() => { load(); }, [reloadToken]);

  const submit = async (e) => {
    e.preventDefault();
    await api(`/${model}`, { method: 'POST', body: JSON.stringify(form) });
    setForm({});
    load();
  };

  return <div className='border p-3 rounded'>
    <h2 className='font-bold mb-2'>{title}</h2>
    <form className='grid grid-cols-2 gap-2' onSubmit={submit}>
      {fields.map((f) => <input key={f} className='border px-2 py-1' placeholder={f} value={form[f] ?? ''} onChange={(e) => setForm({ ...form, [f]: e.target.value === '' ? '' : Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })} />)}
      <button className='bg-blue-500 text-white px-2 py-1 rounded col-span-2'>Add</button>
    </form>
    <div className='mt-2 text-sm space-y-1 max-h-40 overflow-auto'>
      {rows.map((r) => <div className='flex justify-between border-b' key={r.id}><span>{JSON.stringify(r)}</span><button className='text-red-600' onClick={async () => { await api(`/${model}/${r.id}`, { method: 'DELETE' }); load(); }}>del</button></div>)}
    </div>
  </div>;
}

function App() {
  const [schedule, setSchedule] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [err, setErr] = useState('');

  const load = async () => {
    setSchedule(await api('/schedule/view'));
    setSubjects(await api('/subjects'));
    setTeachers(await api('/teachers'));
    setGroups(await api('/groups'));
  };

  useEffect(() => { load().catch((e) => setErr(e.code || e.message)); }, [reloadToken]);

  const weeks = useMemo(() => [...new Set(schedule.map((e) => e.week_number))].sort((a,b) => a-b), [schedule]);

  return <div className='p-4 space-y-4'>
    <h1 className='text-2xl font-bold'>TEST DARS JADVALI MVP</h1>
    {err && <div className='bg-red-100 p-2'>{err}</div>}
    <div className='grid grid-cols-3 gap-3'>
      <Crud title='Groups' model='groups' fields={['name', 'weekly_limit_min', 'weekly_limit_max', 'daily_limit_min', 'daily_limit_max']} reloadToken={reloadToken} />
      <Crud title='Teachers' model='teachers' fields={['first_name', 'last_name', 'department', 'max_daily_hours', 'max_weekly_hours']} reloadToken={reloadToken} />
      <Crud title='Blocked Days (max_pairs: 0-5)' model='blockedDays' fields={['day', 'max_pairs']} reloadToken={reloadToken} />
      <Crud title='Subjects' model='subjects' fields={['name', 'type', 'total_hours', 'weekly_hours', 'priority', 'semester', 'department', 'group_id', 'teacher_id']} reloadToken={reloadToken} />
      <Crud title='Holidays' model='holidays' fields={['date', 'week_number', 'day']} reloadToken={reloadToken} />
    </div>

    <div className='flex gap-2'>
      <button className='bg-green-600 text-white px-3 py-1 rounded' onClick={async () => { try { await api('/schedule/generate', { method: 'POST' }); await load(); } catch (e) { setErr(e.code || e.message); } }}>Generate</button>
      <button className='bg-yellow-500 text-white px-3 py-1 rounded' onClick={async () => { const h = prompt('holiday: date,week,day'); if (!h) return; const [date, week_number, day] = h.split(','); try { await api('/schedule/holiday', { method: 'POST', body: JSON.stringify({ date, week_number: Number(week_number), day: Number(day) }) }); await load(); } catch (e) { setErr(e.code || e.message); } }}>Apply Holiday</button>
      <button className='bg-slate-700 text-white px-3 py-1 rounded' onClick={() => setReloadToken((x) => x + 1)}>Refresh</button>
    </div>

    {groups.map((g) => <button key={g.id} className='border px-2 py-1 mr-2' onClick={async () => {
      const blob = await api(`/schedule/pdf/${g.id}`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }}>PDF {g.name}</button>)}

    {weeks.map((w) => <div key={w} className='border rounded p-2'>
      <h3 className='font-bold'>Week {w}</h3>
      <div className='grid grid-cols-6 gap-1'>
        {days.map((d) => <div key={d} className='border p-1'>
          <div className='font-semibold'>Day {d}</div>
          {pairs.map((p) => {
            const e = schedule.find((x) => x.week_number === w && x.day === d && p >= x.pair_start && p < x.pair_start + x.pair_length);
            if (!e) return <div key={p} className='h-12 border my-1 text-xs'>Pair {p}</div>;
            const s = subjects.find((x) => x.id === e.subject_id);
            const t = teachers.find((x) => x.id === e.teacher_id);
            const colors = e.color === 'red' ? 'bg-red-300' : e.color === 'yellow' ? 'bg-yellow-300' : 'bg-green-300';
            return <div key={p} className={`h-12 border my-1 text-xs p-1 ${colors}`}>
              <div className='font-bold'>{s?.name?.toUpperCase()}</div>
              <div>Teacher: {t?.last_name} {t?.first_name?.[0]}.</div>
            </div>;
          })}
        </div>)}
      </div>
    </div>)}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
