
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Send,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
  X,
  Save,
} from "lucide-react";
import { api } from "../api/client";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
};

type HistoryItem = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  messages: Message[];
  history: HistoryItem[];
};

type AiSuggestion = {
  id: string;
  draft: string;
};

type Props = {
  ticketId: string;
  onBack: () => void;
};

const TICKET_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function TicketDetails({ ticketId, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [aiDraft, setAiDraft] = useState("");
  const [suggestionId, setSuggestionId] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [reviewingDraft, setReviewingDraft] = useState(false);

  const [newStatus, setNewStatus] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  async function loadTicket() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<{ ticket: Ticket }>(
        `/tickets/${ticketId}`,
      );

      setTicket(response.data.ticket);
      setNewStatus(response.data.ticket.status);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const response = (
          err as { response?: { data?: { error?: string } } }
        ).response;

        setError(response?.data?.error ?? "Could not load this ticket.");
      } else {
        setError("Could not connect to the backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTicket();
  }, [ticketId]);

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reply.trim()) return;

    setSending(true);
    setError("");
    setNotice("");

    try {
      await api.post(`/tickets/${ticketId}/messages`, {
        body: reply.trim(),
      });

      setReply("");
      setNotice("Reply sent successfully.");
      await loadTicket();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const response = (
          err as { response?: { data?: { error?: string } } }
        ).response;

        setError(response?.data?.error ?? "Could not send your reply.");
      } else {
        setError("Could not connect to the backend.");
      }
    } finally {
      setSending(false);
    }
  }

  async function generateAiDraft() {
    setAiLoading(true);
    setAiMessage("");
    setError("");

    try {
      const response = await api.post<{
        suggestion?: AiSuggestion;
        id?: string;
        draft?: string;
        message?: string;
      }>(`/tickets/${ticketId}/ai-draft`);

      const suggestion = response.data.suggestion;
      const id = suggestion?.id ?? response.data.id;
      const draft = suggestion?.draft ?? response.data.draft;

      if (!id || !draft) {
        throw new Error(
          response.data.message ??
            "The backend response did not include a draft and suggestion ID.",
        );
      }

      setSuggestionId(id);
      setAiDraft(draft);
      setAiMessage("AI draft generated. Review it before approval.");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const response = (
          err as { response?: { data?: { error?: string } } }
        ).response;

        setAiMessage(
          response?.data?.error ?? "Could not generate an AI draft.",
        );
      } else if (err instanceof Error) {
        setAiMessage(err.message);
      } else {
        setAiMessage("Could not connect to the backend.");
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function reviewAiDraft(action: "approve" | "reject") {
    if (!suggestionId) {
      setAiMessage("Generate a draft first.");
      return;
    }

    setReviewingDraft(true);
    setAiMessage("");

    try {
      await api.patch(
        `/tickets/${ticketId}/ai-suggestions/${suggestionId}`,
        {
          status: action === "approve" ? "APPROVED" : "REJECTED",
        },
      );

      if (action === "approve") {
        setReply(aiDraft);
        setAiMessage(
          "Draft approved and copied to the reply box. Send it when ready.",
        );
      } else {
        setAiMessage("AI draft rejected.");
      }

      setAiDraft("");
      setSuggestionId("");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const response = (
          err as { response?: { data?: { error?: string } } }
        ).response;

        setAiMessage(
          response?.data?.error ?? `Could not ${action} the AI draft.`,
        );
      } else {
        setAiMessage("Could not connect to the backend.");
      }
    } finally {
      setReviewingDraft(false);
    }
  }

  async function updateTicketStatus() {
    if (!ticket || !newStatus || newStatus === ticket.status) return;

    setStatusSaving(true);
    setError("");
    setNotice("");

    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status: newStatus,
        note: "Status updated from the ticket details page",
      });

      setNotice("Ticket status updated successfully.");
      await loadTicket();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const response = (
          err as {
            response?: {
              data?: { error?: string; message?: string };
            };
          }
        ).response;

        setError(
          response?.data?.error ??
            response?.data?.message ??
            "Could not update ticket status. Check your permissions.",
        );
      } else {
        setError("Could not connect to the backend.");
      }
    } finally {
      setStatusSaving(false);
    }
  }

  if (loading && !ticket) {
    return <main className="ticket-details-page">Loading ticket...</main>;
  }

  if (!ticket) {
    return (
      <main className="ticket-details-page">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} /> Back to tickets
        </button>
        <p className="error-box">{error || "Ticket not found."}</p>
      </main>
    );
  }

  return (
    <main className="ticket-details-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to tickets
      </button>

      <div className="details-heading">
        <div>
          <p className="eyebrow">SUPPORT REQUEST</p>
          <h1>{ticket.title}</h1>
          <p className="subtitle">
            Created by {ticket.creator.name} ·{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>

        <span className={`status status-${ticket.status.toLowerCase()}`}>
          {ticket.status.replaceAll("_", " ")}
        </span>
      </div>

      {error && <p className="error-box">{error}</p>}
      {notice && <p className="success-message">{notice}</p>}

      <section className="panel status-management-panel">
        <h2>Manage ticket status</h2>
        <p>Update the status and record the change in ticket history.</p>

        <div className="status-management-controls">
          <select
            aria-label="New ticket status"
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value)}
          >
            {TICKET_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void updateTicketStatus()}
            disabled={
              statusSaving ||
              loading ||
              !newStatus ||
              newStatus === ticket.status
            }
          >
            <Save size={16} />
            {statusSaving ? "Saving..." : "Save Status"}
          </button>
        </div>
      </section>

      <section className="panel details-summary">
        <h2>Ticket description</h2>
        <p>{ticket.description}</p>
        <p>
          <strong>Category:</strong> {ticket.category}
        </p>
        <p>
          <strong>Requester:</strong> {ticket.creator.email}
        </p>
      </section>

      <section className="panel conversation-panel">
        <div className="panel-heading">
          <div>
            <h2>Conversation</h2>
            <p>Messages from the requester and support team</p>
          </div>

          <button
            className="refresh-button"
            onClick={() => void loadTicket()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {ticket.messages.length === 0 ? (
          <p className="empty-state">No replies yet.</p>
        ) : (
          <div className="conversation-list">
            {ticket.messages.map((message) => (
              <article className="conversation-message" key={message.id}>
                <div className="message-heading">
                  <strong>{message.author.name}</strong>
                  <span>{message.author.role.replaceAll("_", " ")}</span>
                  <small>
                    {new Date(message.createdAt).toLocaleString()}
                  </small>
                </div>
                <p>{message.body}</p>
              </article>
            ))}
          </div>
        )}

        <section className="ai-assistant">
          <div className="panel-heading">
            <div>
              <h3>
                <Sparkles size={18} /> AI Reply Assistant
              </h3>
              <p>Generate a draft, review it, and approve or reject it.</p>
            </div>
          </div>

          <button
            type="button"
            className="ai-generate-button"
            onClick={() => void generateAiDraft()}
            disabled={aiLoading || reviewingDraft}
          >
            <Sparkles size={16} />
            {aiLoading ? "Generating draft..." : "Generate AI draft"}
          </button>

          {aiDraft && (
            <div className="ai-draft-box">
              <label htmlFor="ai-draft">Review and edit the AI draft</label>
              <textarea
                id="ai-draft"
                rows={5}
                value={aiDraft}
                onChange={(event) => setAiDraft(event.target.value)}
              />

              <div className="ai-actions">
                <button
                  type="button"
                  onClick={() => void reviewAiDraft("approve")}
                  disabled={reviewingDraft || !aiDraft.trim()}
                >
                  <Check size={16} />
                  {reviewingDraft ? "Saving..." : "Approve draft"}
                </button>

                <button
                  type="button"
                  className="ai-reject-button"
                  onClick={() => void reviewAiDraft("reject")}
                  disabled={reviewingDraft}
                >
                  <X size={16} />
                  Reject draft
                </button>
              </div>
            </div>
          )}

          {aiMessage && <p className="ai-feedback">{aiMessage}</p>}
        </section>

        <form className="reply-form" onSubmit={sendReply}>
          <label htmlFor="ticket-reply">Write a reply</label>
          <textarea
            id="ticket-reply"
            rows={4}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Type your message..."
            required
          />

          <button type="submit" disabled={sending || !reply.trim()}>
            <Send size={16} />
            {sending ? "Sending..." : "Send reply"}
          </button>
        </form>
      </section>

      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>Status history</h2>
            <p>Recorded changes to this ticket</p>
          </div>
          <Clock size={20} />
        </div>

        {ticket.history.length === 0 ? (
          <p className="empty-state">No status history available.</p>
        ) : (
          <div className="history-list">
            {ticket.history.map((item) => (
              <article className="history-item" key={item.id}>
                <div>
                  <strong>
                    {item.fromStatus
                      ? `${item.fromStatus.replaceAll("_", " ")} → ${item.toStatus.replaceAll("_", " ")}`
                      : item.toStatus.replaceAll("_", " ")}
                  </strong>
                  {item.note && <p>{item.note}</p>}
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
