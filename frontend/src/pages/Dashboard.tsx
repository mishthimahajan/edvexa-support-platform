
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Clock3,
  Headset,
  LayoutDashboard,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { api } from "../api/client";

type Metrics = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  assignedToMe: number;
};

type RecentTicket = {
  id: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string;
  creator: { name: string; email: string };
  assignee: { name: string; email: string } | null;
};

type ActivityItem = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  ticket: { id: string; title: string };
  changedBy: { id: string; name: string };
};

type DashboardData = {
  metrics: Metrics;
  recentTickets: RecentTicket[];
  recentActivity: ActivityItem[];
};

const metricCards = [
  { key: "total", label: "Total tickets", icon: Ticket },
  { key: "open", label: "Open tickets", icon: CircleDot },
  { key: "inProgress", label: "In progress", icon: Clock3 },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
  { key: "closed", label: "Closed", icon: CheckCircle2 },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function Dashboard({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<DashboardData>("/dashboard");
      setData(response.data);
    } catch (err) {
      setError(
        axiosErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <main className="dashboard">
      
<header className="topbar">
  <div className="brand">
    <Headset size={28} />
    <span>Edvexa</span>
  </div>

  <div className="topbar-actions">
    <span className="topbar-label">Customer Support</span>
    <button className="logout-button" onClick={onLogout}>
      Sign out
    </button>
  </div>
</header>


      <section className="dashboard-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SUPPORT CENTER</p>
            <h1>Dashboard</h1>
            <p className="subtitle">
              Monitor support tickets and recent activity.
            </p>
          </div>
          <button
            className="refresh-button"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {loading && <p className="notice">Loading dashboard...</p>}

        {error && (
          <div className="error-box">
            {error}
            <p>Check that the backend is running and you are logged in.</p>
          </div>
        )}

        {data && (
          <>
            <div className="metrics-grid">
              {metricCards.map(({ key, label, icon: Icon }) => (
                <article className="metric-card" key={key}>
                  <div className="metric-label">
                    <span>{label}</span>
                    <Icon size={19} />
                  </div>
                  <strong>{data.metrics[key]}</strong>
                </article>
              ))}
            </div>

            <div className="dashboard-columns">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent tickets</h2>
                    <p>Latest updated support requests</p>
                  </div>
                  <LayoutDashboard size={20} />
                </div>

                {data.recentTickets.length === 0 ? (
                  <p className="empty-state">No tickets yet.</p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Ticket</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTickets.map((ticket) => (
                          <tr key={ticket.id}>
                            <td>
                              <strong>{ticket.title}</strong>
                              <small>{ticket.creator.name}</small>
                            </td>
                            <td>{ticket.category}</td>
                            <td>
                              <span
                                className={`status status-${ticket.status.toLowerCase()}`}
                              >
                                {ticket.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>{formatDate(ticket.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Latest ticket updates</p>
                  </div>
                  <Activity size={20} />
                </div>

                {data.recentActivity.length === 0 ? (
                  <p className="empty-state">No activity yet.</p>
                ) : (
                  <div className="activity-list">
                    {data.recentActivity.map((item) => (
                      <article className="activity-item" key={item.id}>
                        <div className="activity-dot" />
                        <div>
                          <strong>{item.ticket.title}</strong>
                          <p>
                            {item.changedBy.name} · {item.note || item.toStatus}
                          </p>
                          <small>{formatDate(item.createdAt)}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function axiosErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as { response?: { data?: { error?: string }; status?: number } }
    ).response;

    if (response?.status === 401) {
      return "Please log in first. The dashboard requires a valid token.";
    }

    return response?.data?.error || "Could not load the dashboard.";
  }

  return "Could not connect to the backend. Check that it is running.";
}
