import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { friends } from "@/data/movieData";

const groups = [
  {
    label: "Today",
    items: [
      { type: "follow", friend: friends[1], title: "Shruti followed you", detail: "You both love sci-fi and prestige drama.", time: "20m" },
      { type: "like", friend: friends[2], title: "Rohan liked your Joker review", detail: "Your review is getting attention.", time: "2h" },
      { type: "blend", friend: friends[3], title: "New Blend ready", detail: "Arjun has 81% taste overlap with you.", time: "5h" }
    ]
  },
  {
    label: "This Week",
    items: [
      { type: "watched", friend: friends[4], title: "Meera watched Friends", detail: "Comfort episode unlocked.", time: "1d" },
      { type: "review", friend: friends[1], title: "Shruti reviewed Interstellar", detail: "Rated it 5.0 after a weekend rewatch.", time: "2d" },
      { type: "recommendation", friend: friends[0], title: "Recommendation for you", detail: "Because you saved Dune, try Foundation next.", time: "3d" }
    ]
  },
  {
    label: "Earlier",
    items: [
      { type: "activity", friend: friends[2], title: "Rohan added The Batman", detail: "Added to a neo-noir watchlist.", time: "1w" },
      { type: "like", friend: friends[3], title: "Arjun liked your list", detail: "Best rainy-night movies got a new like.", time: "2w" }
    ]
  }
];

const iconByType = {
  activity: "reels",
  like: "heart",
  review: "comment",
  watched: "reels",
  follow: "profile",
  recommendation: "bookmark",
  blend: "messages"
};

export default function NotificationsScreen() {
  return (
    <section className="notifications-screen social-route">
      {groups.map((group) => (
        <div className="notification-group" key={group.label}>
          <h2>{group.label}</h2>
          {group.items.map((notification) => (
            <article className="notification" key={`${group.label}-${notification.title}`}>
              <div className="notification-avatar">
                <Avatar className={notification.friend.avatar} />
                <span><Icon name={iconByType[notification.type]} /></span>
              </div>
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.detail}</p>
              </div>
              <small>{notification.time}</small>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
