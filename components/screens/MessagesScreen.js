"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { conversations } from "@/data/movieData";

const friendSuggestions = [
  { id: "shruti", name: "Shruti", handle: "@shruti", avatar: "avatar-two", match: 94, mutuals: 8, genres: ["Sci-Fi", "Drama"], bio: "Prestige drama and cosmic rewatches." },
  { id: "rohan", name: "Rohan", handle: "@rohan99", avatar: "avatar-three", match: 88, mutuals: 6, genres: ["Crime", "Action"], bio: "Neo-noir lists and theater-first picks." },
  { id: "arjun", name: "Arjun", handle: "@arjunfilms", avatar: "avatar-four", match: 81, mutuals: 4, genres: ["Action", "Fantasy"], bio: "Weekend superhero chaos, weekday slow cinema." }
];

export default function MessagesScreen() {
  const [mode, setMode] = useState("messages");
  const [activeConversation, setActiveConversation] = useState(null);
  const [friendStates, setFriendStates] = useState({ shruti: "friends" });
  const [query, setQuery] = useState("");
  const filteredFriends = friendSuggestions.filter((friend) => `${friend.name} ${friend.handle} ${friend.genres.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

  function toggleFriend(id) {
    setFriendStates((current) => {
      const state = current[id] || "add";
      return { ...current, [id]: state === "add" ? "requested" : state === "requested" ? "friends" : "add" };
    });
  }

  if (activeConversation) {
    return (
      <section className="messages-screen social-route">
        <button className="social-back" type="button" onClick={() => setActiveConversation(null)}><Icon name="back" /> Back</button>
        <div className="route-chat">
          <div className="route-chat-head"><Avatar className={activeConversation.friend.avatar} size="sm" /><strong>{activeConversation.friend.name}</strong><small>{activeConversation.time}</small></div>
          <div className="route-chat-body">
            <p>{activeConversation.lastMessage}<span>{activeConversation.time}</span></p>
            <p className="me">Absolutely. Adding it to my weekend queue.<span>Now</span></p>
          </div>
          <form className="route-composer" onSubmit={(event) => event.preventDefault()}>
            <input placeholder="Message..." />
            <button type="submit"><Icon name="send" /></button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="messages-screen social-route">
      <div className="social-tabs">
        <button className={mode === "messages" ? "selected" : ""} type="button" onClick={() => setMode("messages")}>Messages</button>
        <button className={mode === "friends" ? "selected" : ""} type="button" onClick={() => setMode("friends")}>Friends</button>
      </div>
      {mode === "messages" ? (
        <>
          <div className="search-box">Search conversations...</div>
          {conversations.map((conversation) => (
            <button className="conversation" key={conversation.friend.name} type="button" onClick={() => setActiveConversation(conversation)}>
              <Avatar className={conversation.friend.avatar} />
              <div>
                <strong>{conversation.friend.name}</strong>
                <p>{conversation.lastMessage}</p>
              </div>
              <div className="conversation-meta">
                <small>{conversation.time}</small>
                {conversation.unread > 0 && <span>{conversation.unread}</span>}
              </div>
            </button>
          ))}
        </>
      ) : (
        <>
          <div className="social-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends" /></div>
          <div className="friend-suggestions">
            {filteredFriends.map((friend) => {
              const state = friendStates[friend.id] || "add";
              return (
                <article key={friend.id}>
                  <Avatar className={friend.avatar} />
                  <span><strong>{friend.name}<small>{friend.match}% match</small></strong><em>{friend.mutuals} mutuals - {friend.genres.join(", ")}</em><i>{friend.bio}</i></span>
                  <button className={state} type="button" onClick={() => toggleFriend(friend.id)}>{state === "friends" ? "Remove" : state === "requested" ? "Requested" : "Add"}</button>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
