import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import { notifications } from "@/data/movieData";

const iconByType = {
  activity: "reels",
  like: "heart",
  comment: "comment",
  follow: "profile",
  recommendation: "bookmark"
};

export default function NotificationsScreen() {
  return (
    <section className="notifications-screen">
      {notifications.map((notification) => (
        <article className="notification" key={`${notification.type}-${notification.title}`}>
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
    </section>
  );
}
