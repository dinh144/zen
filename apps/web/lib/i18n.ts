import { CLOUD } from "./cloud"

// zen speaks two languages. Vietnamese is the default here; English is the fallback.
export const LOCALES = ["vi", "en"] as const
export type Locale = (typeof LOCALES)[number]

export const STRINGS = {
  nav: { everything: ["tất cả", "everything"], spaces: ["không gian", "spaces"], drift: ["trôi", "drift"], marks: ["dấu", "marks"] },
  board: {
    search: ["bạn đang tìm gì", "what are you looking for"],
    hint: ["một màu, một vật, một chữ bạn còn nhớ", "a colour, an object, a word you remember"],
    inking: ["đang thấm mực…", "inking…"],
    atHand: ["trong tầm tay", "at hand"],
    ink: ["mực", "ink"],
    composer: ["một ý nghĩ, hoặc một đường dẫn", "a thought, or a link"],
    save: ["đặt xuống · ⌘↵", "set it down · ⌘↵"],
    keep: ["giữ", "keep"],
    letGo: ["buông", "let go"],
    settling: ["đang lắng…", "settling…"],
    emptyQuery: [
      "Không có gì ở đây. Hỏi theo cách khác — một màu, một vật, một cảm giác.",
      "Nothing here. Ask for it another way — a colour, an object, a feeling.",
    ],
    empty: [
      "Còn trống. Dán một đường dẫn, thả một tấm ảnh, hoặc viết một dòng.",
      "Empty, for now. Paste a link, drop an image, or write one line.",
    ],
    dropHere: ["thả vào đây", "let it fall here"],
    limit: ["Hôm nay đã đặt xuống đủ rồi. Mai quay lại nhé.", "That is enough for today. Come back tomorrow."],
    failed: ["Chưa lưu được. Thử lại.", "That did not save. Try again."],
  },
  card: {
    thought: ["thêm một ý nghĩ", "add a thought"],
    pin: ["giữ trong tầm tay", "keep at hand"],
    pinned: ["trong tầm tay", "at hand"],
    read: ["đọc", "read"],
    vibe: ["cùng một khí", "same air"],
    tie: ["buộc", "tie"],
    untie: ["gỡ", "untie"],
    tiedTo: ["buộc với", "tied to"],
    sameAir: ["cùng một khí", "same air"],
    letGo: ["buông", "let go"],
    findToLink: ["card nào thuộc về cùng chỗ này", "which card does this belong with"],
  },
  spaces: {
    title: ["không gian", "spaces"],
    name: ["tên", "name"],
    aName: ["một cái tên", "a name"],
    gathers: ["gom theo", "gathers"],
    gathersHint: ["một câu tìm để nó tự đầy — không bắt buộc", "a search it fills itself with — optional"],
    open: ["mở ra", "open it"],
    share: ["chia sẻ bằng liên kết", "share by link"],
    copy: ["chép liên kết", "copy link"],
    private: ["giữ riêng tư", "keep it private"],
    letGo: ["buông không gian này", "let this space go"],
    cards: ["thẻ", "cards"],
    none: [
      "Chưa có không gian nào. Một không gian giữ thẻ bạn chọn, hoặc tự gom theo một câu tìm.",
      "No spaces yet. A space holds cards you chose, or gathers them itself from one search.",
    ],
  },
  settings: {
    title: ["thiết lập", "settings"],
    cards: ["thẻ", "cards"],
    ai: ["gắn thẻ, ocr, tìm theo nghĩa", "tagging, ocr, semantic search"],
    aiOn: ["đang chạy · ollama", "on · ollama"],
    aiOff: ["ollama không trả lời", "ollama is not answering"],
    aiOnCloud: ["đang chạy · gemini", "on · gemini"],
    aiOffCloud: ["gemini không trả lời", "gemini is not answering"],
    yourDrop: ["giọt của bạn", "your drop"],
    language: ["ngôn ngữ", "language"],
    export: ["mang mọi thứ đi · json", "take everything with you · json"],
    import: ["nạp một thư viện vào · json, html, csv", "bring a library in · json, html, csv"],
    importing: ["đang nạp…", "importing…"],
    imported: ["đã nạp %n thẻ — việc gắn thẻ chạy ở nền", "%n cards imported — tagging runs in the background"],
    delete: ["xoá tài khoản và mọi thẻ", "delete my account and every card"],
    deleteSure: ["bấm lần nữa để xoá vĩnh viễn", "press again to delete for good"],
    deleteKeep: ["thôi, giữ lại", "no, keep it"],
  },
  marks: { title: ["dấu", "marks"], tags: ["thẻ chữ", "tags"], days: ["ngày", "days"] },
  rail: {
    bringIn: ["mang một tệp vào", "bring in a file"],
    brush: ["bút lông — viết dài", "brush — write at length"],
    drift: ["trôi", "drift"],
    paper: ["giấy", "paper"],
    night: ["mực ban đêm", "ink at night"],
    loosen: ["nới bảng ra", "loosen the board"],
    tighten: ["siết bảng lại", "tighten the board"],
    language: ["english", "tiếng việt"],
  },
  inks: {
    sumi: ["mực tàu", "sumi"], earth: ["đất", "earth"], vermilion: ["son", "vermilion"], persimmon: ["hồng chín", "persimmon"],
    saffron: ["nghệ", "saffron"], moss: ["rêu", "moss"], jade: ["ngọc", "jade"], indigo: ["chàm", "indigo"],
    wisteria: ["tử đằng", "wisteria"], plum: ["mận", "plum"], stone: ["đá", "stone"], shell: ["vỏ sò", "shell"],
  },
  moods: {
    neutral: ["bình thản", "neutral"], attentive: ["chăm chú", "attentive"], surprised: ["ngạc nhiên", "surprised"],
    excited: ["háo hức", "excited"], happy: ["vui", "happy"], laughing: ["cười", "laughing"], angry: ["giận", "angry"],
    sad: ["buồn", "sad"], scared: ["sợ", "scared"], suspicious: ["nghi ngờ", "suspicious"], confused: ["bối rối", "confused"],
    curious: ["tò mò", "curious"], proud: ["tự hào", "proud"], shy: ["ngượng", "shy"], unimpressed: ["chẳng ấn tượng", "unimpressed"],
    sleepy: ["buồn ngủ", "sleepy"],
  },
  kinds: {
    note: ["ghi chú", "note"],
    quote: ["trích dẫn", "quote"],
    link: ["liên kết", "link"],
    article: ["bài viết", "article"],
    image: ["ảnh", "image"],
    video: ["video", "video"],
    product: ["sản phẩm", "product"],
    book: ["sách", "book"],
    movie: ["phim", "movie"],
    recipe: ["công thức", "recipe"],
    tweet: ["bài đăng", "post"],
    person: ["người", "person"],
    color: ["màu", "colour"],
    font: ["phông chữ", "font"],
    pdf: ["pdf", "pdf"],
    file: ["tệp", "file"],
  },
  share: { notShared: ["Liên kết này không được chia sẻ.", "This link is not shared."] },
  errors: {
    missing: ["Không có gì ở đây.", "Nothing here."],
    broke: ["Có gì đó vừa đổ mực. Thẻ của bạn vẫn an toàn.", "Something spilled. Your cards are safe."],
    retry: ["thử lại", "try again"],
    home: ["về bảng", "back to the board"],
  },
  focus: {
    placeholder: ["một hơi, một dòng", "one breath, one line"],
    hint: ["⌘↵ để đặt xuống · esc để rời đi", "⌘↵ to set it down · esc to leave"],
    saved: ["đã đặt xuống", "set down"],
  },
  read: { back: ["← quay lại", "← back"], none: ["Thẻ này chưa giữ bản đọc.", "No reading copy was kept for this card."] },
  landing: {
    tagline: ["Thả vào. Quên đi. Tìm lại được.", "Drop it in. Forget it. Find it again."],
    sub: [
      "zen chạy trên máy bạn. Không quảng cáo, không bảng tin, không điểm số — chỉ có mực, giấy và trí nhớ của bạn.",
      "zen runs on your machine. No ads, no feed, no scores — just ink, paper, and your memory.",
    ],
    enter: ["mở trí nhớ của bạn", "open your mind"],
    captureTitle: ["Bắt lấy trong một động tác", "Catch it in one gesture"],
    captureBody: [
      "Dán một đường dẫn, thả một tấm ảnh, bôi đen một đoạn rồi lưu, hoặc chỉ gõ một dòng. Tiện ích trình duyệt và màn hình chia sẻ trên điện thoại đi cùng.",
      "Paste a link, drop an image, highlight a passage, or type one line. The browser extension and the phone share sheet come along.",
    ],
    subCloud: [
      "Không quảng cáo, không bảng tin, không điểm số — chỉ có mực, giấy và trí nhớ của bạn, ở mọi thiết bị.",
      "No ads, no feed, no scores — just ink, paper, and your memory, on every device.",
    ],
    readTitle: ["Nó tự hiểu thứ bạn lưu", "It reads what you keep"],
    readBody: [
      "Mô hình chạy ngay trên máy: gắn thẻ ảnh, đọc chữ trong ảnh, lấy bảng màu, tóm tắt bài viết, đọc PDF từng trang. Không có gì rời khỏi máy bạn.",
      "A local model tags images, reads the words inside them, samples the palette, summarises articles and reads PDFs page by page. Nothing leaves your machine.",
    ],
    readBodyCloud: [
      "Một mô hình gắn thẻ ảnh, đọc chữ trong ảnh, lấy bảng màu, tóm tắt bài viết, đọc PDF từng trang. Thẻ của bạn chỉ bạn thấy.",
      "A model tags images, reads the words inside them, samples the palette, summarises articles and reads PDFs page by page. Only you see your cards.",
    ],
    findTitle: ["Tìm bằng thứ bạn còn nhớ", "Find it by what you remember"],
    findBody: [
      "Một ô duy nhất. Gõ một màu, một vật, một chữ nằm trong tấm ảnh, một ngày, hay cả câu mô tả — zen hiểu theo nghĩa, không chỉ theo từ.",
      "One field. A colour, an object, a word inside a picture, a date, or a whole description — zen searches by meaning, not just by word.",
    ],
    keepTitle: ["Không gian, và những thứ trôi về", "Spaces, and things that drift back"],
    keepBody: [
      "Gom thẻ vào không gian, hoặc để không gian tự đầy từ một câu tìm. Trôi mang những thẻ cũ quay lại, mỗi lần một ít: giữ, hoặc buông.",
      "Gather cards into a space, or let a space fill itself from one search. Drift brings old cards back, a few at a time: keep them, or let them go.",
    ],
    privacyTitle: ["Của bạn, và chỉ của bạn", "Yours, and only yours"],
    privacyBody: [
      "Postgres chạy trên máy bạn, mô hình chạy trên máy bạn, và mọi thứ xuất ra một file JSON bất cứ lúc nào.",
      "Postgres on your machine, the model on your machine, and everything exports to one JSON file whenever you want.",
    ],
    privacyBodyCloud: [
      "Mỗi người một kho riêng, không ai khác đọc được. Mọi thứ xuất ra một file JSON bất cứ lúc nào, và mã nguồn mở để tự chạy trên máy mình.",
      "Each mind is its own, and nobody else can read it. Everything exports to one JSON file whenever you want, and the code is open to run on your own machine.",
    ],
    moodsTitle: ["Một giọt mực, mười sáu tâm trạng", "One drop of ink, sixteen moods"],
    moodsBody: [
      "Giọt mực là mặt của zen. Nó chăm chú khi bạn tìm, tò mò khi bạn gõ, bối rối khi không thấy gì, và ngủ gật trong lúc trôi.",
      "The drop is zen's face. It pays attention while you search, turns curious as you type, gets confused when nothing is found, and dozes off on drift.",
    ],
    footer: ["mực trên giấy · chạy cục bộ · mã nguồn mở", "ink on paper · runs locally · open source"],
    footerCloud: ["mực trên giấy · mã nguồn mở", "ink on paper · open source"],
    refuseTitle: ["zen từ chối những thứ này", "what zen refuses"],
    refuse: [
      "không quảng cáo · không bảng tin · không điểm số · không tài khoản · không đám mây · không ai nhìn vào",
      "no ads · no feed · no scores · no accounts · no cloud · nobody looking in",
    ],
    refuseCloud: [
      "không quảng cáo · không bảng tin · không điểm số · không bán dữ liệu · không ai nhìn vào",
      "no ads · no feed · no scores · no selling your data · nobody looking in",
    ],
    kindsTitle: ["Mỗi thứ được giữ theo cách của nó", "Each thing is kept its own way"],
    kindsBody: [
      "Một đường dẫn không phải là một tấm ảnh. zen nhận ra bài viết, sản phẩm, video, PDF, bảng màu, trích dẫn — và vẽ mỗi loại một kiểu.",
      "A link is not a picture. zen recognises an article, a product, a video, a PDF, a palette, a quote — and draws each one differently.",
    ],
    demoSearchTitle: ["Gõ như đang nhớ lại", "Type the way you remember"],
    demoSearchBody: [
      "Không có thư mục, không có thẻ phải tự đặt. Gõ điều bạn còn nhớ, kể cả khi bỏ dấu, zen vẫn tìm ra.",
      "No folders, no tags to maintain. Type what you remember — even without the accents — and zen still finds it.",
    ],
    localTitle: ["Chạy trên máy bạn, không đi đâu cả", "It runs on your machine, and stays there"],
    localBody: [
      "Postgres trong Docker, mô hình thị giác và embedding chạy bằng Ollama. Không khoá API, không hoá đơn, không ai đọc ké.",
      "Postgres in Docker, a vision model and embeddings through Ollama. No API key, no bill, nobody reading over your shoulder.",
    ],
    stack: ["postgres · pgvector · ollama · next.js", "postgres · pgvector · ollama · next.js"],
    localTitleCloud: ["Ở mọi nơi bạn ở, hoặc chỉ trên máy bạn", "Wherever you are, or only on your machine"],
    localBodyCloud: [
      "Vào bằng Google hoặc một đường dẫn qua email, trên máy tính và điện thoại. Muốn không gì rời khỏi máy thì tự chạy zen với Postgres và Ollama.",
      "Sign in with Google or a link by email, on the laptop and the phone. If nothing may leave your machine, run zen yourself with Postgres and Ollama.",
    ],
    stackCloud: ["postgres · pgvector · gemini · next.js", "postgres · pgvector · gemini · next.js"],
    forTitle: ["Hợp với ai", "Who it is for"],
    forList: [
      "người thiết kế · người viết · người học · người nghiên cứu · người hay quên",
      "designers · writers · students · researchers · people who forget",
    ],
    ctaTitle: ["Bắt đầu bằng một thứ bạn sắp quên", "Start with one thing you are about to forget"],
  },
  login: {
    password: ["mật khẩu", "password"],
    enter: ["vào", "enter"],
    wrong: ["Không phải mật khẩu đó.", "Not that one."],
    email: ["email của bạn", "your email"],
    sendLink: ["gửi đường dẫn vào", "send me a link"],
    sent: ["Đã gửi. Mở email và bấm vào đường dẫn.", "Sent. Open your mail and follow the link."],
    google: ["vào bằng google", "continue with google"],
    failed: ["Đường dẫn không dùng được nữa. Thử lại.", "That link no longer works. Try again."],
    out: ["rời đi", "sign out"],
  },
} as const

type Section = keyof typeof STRINGS

// The cloud build says what is true of the cloud: no "runs on your machine".

export function translate<S extends Section>(locale: Locale, section: S, key: keyof (typeof STRINGS)[S]) {
  const strings = STRINGS[section] as Record<string, unknown>
  const cloudKey = `${String(key)}Cloud`
  const pair = (CLOUD && cloudKey in strings ? strings[cloudKey] : strings[key as string]) as readonly [string, string]
  return locale === "vi" ? pair[0] : pair[1]
}
