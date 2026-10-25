
import { useEffect, useState } from "react";
import { api } from "../api/client";
import TicketDetails from "./TicketDetails";

type TicketItem = {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  createdAt: string;
};

type TicketResponse = {
  tickets?: TicketItem[];
  data?: TicketItem[];
  items?: TicketItem[];
  pagination?: unknown;
};

export default function Tickets() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Account");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    null,
  );

  async function loadTickets() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tickets?page=1&limit=50");
      const result = response.data as TicketResponse | TicketItem[];

      const list = Array.isArray(result)
        ? result
        : result.tickets ?? result.data ?? result.items ?? [];

      setTickets(list);
    } catch {
      setError("Could not load tickets. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  // Show the selected ticket's details and conversation.
  if (selectedTicketId) {
    return (
      <TicketDetails
        ticketId={selectedTicketId}
        onBack={() => {
          setSelectedTicketId(null);
          void loadTickets();
        }}
      />
    );
  }

  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/tickets", {
        subject: title,
        description,
        category,
      });

      setTitle("");
      setDescription("");
      setCategory("Account");
      setMessage("Ticket created successfully.");
      await loadTickets();
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const response = (
          err as { response?: { data?: { error?: string } } }
        ).response;

        setError(response?.data?.error ?? "Could not create the ticket.");
      } else {
        setError("Could not connect to the backend.");
      }
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.category.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      status === "ALL" || ticket.status === status;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="tickets-page">
      <div className="tickets-heading">
        <div>
          <p className="eyebrow">SUPPORT CENTER</p>
          <h1>Support tickets</h1>
          <p className="subtitle">
            Create a support request and track its progress.
          </p>
        </div>

        <button onClick={() => void loadTickets()} disabled={loading}>
          Refresh tickets
        </button>
      </div>

      <section className="ticket-form panel">
        <h2>Create a ticket</h2>

        <form onSubmit={createTicket}>
          <label htmlFor="ticket-title">Subject</label>
          <input
            id="ticket-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Briefly describe your issue"
            required
            maxLength={150}
          />

          <label htmlFor="ticket-category">Category</label>
          <select
            id="ticket-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="Account">Account</option>
            <option value="Technical">Technical</option>
            <option value="Billing">Billing</option>
            <option value="General">General</option>
          </select>

          <label htmlFor="ticket-description">Description</label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Explain the issue and what you have tried."
            rows={4}
            required
          />

          <button type="submit">Submit ticket</button>
        </form>
      </section>

      {error && <p className="error-box">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="panel ticket-list">
        <div className="tickets-toolbar">
          <h2>Your tickets</h2>

          <input
            aria-label="Search tickets"
            placeholder="Search by subject or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label="Filter tickets by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {loading ? (
          <p>Loading tickets...</p>
        ) : filteredTickets.length === 0 ? (
          <p className="empty-state">No matching tickets found.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <button
                        type="button"
                        className="ticket-title-button"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        {ticket.title}
                      </button>
                    </td>
                    <td>{ticket.category}</td>
                    <td>
                      <span
                        className={`status status-${ticket.status.toLowerCase()}`}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

