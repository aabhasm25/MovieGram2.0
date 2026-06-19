import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";

export default function ReelsScreen() {
  return (
    <section className="reel-view poster-joker">
      <div className="reel-actions">
        <button aria-label="Like"><Icon name="heart" /></button><span>1,234</span>
        <button aria-label="Comment"><Icon name="comment" /></button><span>32</span>
        <button aria-label="Share"><Icon name="send" /></button><span>78</span>
        <button aria-label="Save"><Icon name="bookmark" /></button>
      </div>
      <div className="reel-copy">
        <h2>JOKER</h2>
        <p className="year">2019</p>
        <p className="reel-author"><Avatar className="avatar-three" size="sm" /> <strong>rohan99</strong></p>
        <p>Still the best origin story. Joaquin Phoenix was born for this.</p>
        <p>Original audio</p>
      </div>
    </section>
  );
}
