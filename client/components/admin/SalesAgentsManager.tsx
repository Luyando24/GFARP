import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Briefcase
} from 'lucide-react';

interface SalesAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  code: string;
  commission_rate: string;
  status: string;
  total_academies: string;
  total_paid: string;
  total_pending: string;
  created_at: string;
}

interface Academy {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

interface Commission {
  id: string;
  amount: string;
  status: string;
  created_at: string;
}

const SalesAgentsManager: React.FC = () => {
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SalesAgent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
    commission_rate: '10.00'
  });
  
  // Expanded row state for details
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [agentDetails, setAgentDetails] = useState<{academies: Academy[], commissions: Commission[]} | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sales');
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/${id}/details`);
      const data = await res.json();
      if (data.success) {
        setAgentDetails(data.data);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedAgentId === id) {
      setExpandedAgentId(null);
      setAgentDetails(null);
    } else {
      setExpandedAgentId(id);
      fetchAgentDetails(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAgent 
      ? `/api/admin/sales/${editingAgent.id}`
      : '/api/admin/sales';
    const method = editingAgent ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditingAgent(null);
        setFormData({ name: '', email: '', phone: '', code: '', commission_rate: '10.00' });
        fetchAgents();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error saving agent:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      const res = await fetch(`/api/admin/sales/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAgents();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const openEdit = (agent: SalesAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      code: agent.code || '',
      commission_rate: agent.commission_rate
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-blue-600" />
          Sales Agents
        </h2>
        <button
          onClick={() => {
            setEditingAgent(null);
            setFormData({ name: '', email: '', phone: '', code: '', commission_rate: '10.00' });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Commission %</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Sign-ups</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Earnings</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {agents.map((agent) => (
                <React.Fragment key={agent.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleExpand(agent.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          {expandedAgentId === agent.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{agent.name}</div>
                          <div className="text-sm text-gray-500">{agent.email}</div>
                          <div className="text-xs text-gray-400">{agent.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-mono">
                        {agent.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {agent.commission_rate}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white font-medium">
                        <Users className="h-4 w-4 text-gray-400" />
                        {agent.total_academies}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-green-600 font-medium">
                          Paid: ${parseFloat(agent.total_paid).toFixed(2)}
                        </div>
                        <div className="text-xs text-yellow-600">
                          Pending: ${parseFloat(agent.total_pending).toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => openEdit(agent)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(agent.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                  {expandedAgentId === agent.id && (
                    <tr className="bg-gray-50 dark:bg-gray-900/30">
                      <td colSpan={6} className="px-6 py-4">
                        {detailsLoading ? (
                          <div className="text-center py-4 text-sm text-gray-500">Loading details...</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                              <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <Users size={16} /> Referred Academies
                              </h4>
                              {agentDetails?.academies.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No sign-ups yet.</p>
                              ) : (
                                <ul className="space-y-2 max-h-48 overflow-y-auto">
                                  {agentDetails?.academies.map(acc => (
                                    <li key={acc.id} className="text-sm flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-100 dark:border-gray-700">
                                      <div>
                                        <div className="font-medium text-gray-800 dark:text-gray-200">{acc.name}</div>
                                        <div className="text-xs text-gray-500">{new Date(acc.created_at).toLocaleDateString()}</div>
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {acc.status}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                              <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <DollarSign size={16} /> Commissions
                              </h4>
                              {agentDetails?.commissions.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No commissions recorded.</p>
                              ) : (
                                <ul className="space-y-2 max-h-48 overflow-y-auto">
                                  {agentDetails?.commissions.map(comm => (
                                    <li key={comm.id} className="text-sm flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded border border-gray-100 dark:border-gray-700">
                                      <div>
                                        <div className="font-medium text-gray-800 dark:text-gray-200">${comm.amount}</div>
                                        <div className="text-xs text-gray-500">{new Date(comm.created_at).toLocaleDateString()}</div>
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        comm.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {comm.status}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingAgent ? 'Edit Sales Agent' : 'Add New Sales Agent'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referral Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.commission_rate}
                    onChange={e => setFormData({...formData, commission_rate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesAgentsManager;
