import Avatar from "@/components/Avatar";
import { conversations } from "@/data/movieData";

export default function MessagesScreen() {
  return (
    <section className="messages-screen">
      <div className="search-box">Search conversations...</div>
      {conversations.map((conversation) => (
        <article className="conversation" key={conversation.friend.name}>
          <Avatar className={conversation.friend.avatar} />
          <div>
            <strong>{conversation.friend.name}</strong>
            <p>{conversation.lastMessage}</p>
          </div>
          <div className="conversation-meta">
            <small>{conversation.time}</small>
            {conversation.unread > 0 && <span>{conversation.unread}</span>}
          </div>
        </article>
      ))}
    </section>
  );
}
