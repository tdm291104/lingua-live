const PHRASES = {
  en: [
    {
      category: 'Hỏi thăm công việc & sức khoẻ',
      items: [
        { phrase: 'How have you been?',                      meaning: 'Dạo này bạn thế nào?' },
        { phrase: "Hope you're doing well.",                 meaning: 'Mong bạn vẫn khoẻ.' },
        { phrase: 'How are things on your end?',            meaning: 'Mọi thứ bên bạn dạo này thế nào?' },
        { phrase: "It's been a while — how have you been?", meaning: 'Lâu ngày không gặp, bạn có khoẻ không?' },
        { phrase: 'How is everything going with the project?', meaning: 'Dự án bên bạn tiến triển thế nào rồi?' },
        { phrase: 'Hope things have been going smoothly for you.', meaning: 'Mong mọi việc của bạn đang suôn sẻ.' },
        { phrase: 'Take care of yourself!',                 meaning: 'Giữ gìn sức khoẻ nhé!' },
      ],
    },
    {
      category: 'Bày tỏ ý kiến',
      items: [
        { phrase: 'I think / I believe that…',        meaning: 'Tôi nghĩ / Tôi tin rằng…' },
        { phrase: 'In my view / opinion…',            meaning: 'Theo quan điểm của tôi…' },
        { phrase: 'It seems to me that…',             meaning: 'Tôi có cảm giác rằng…' },
        { phrase: "I'd say that…",                    meaning: 'Tôi cho rằng…' },
        { phrase: 'The way I see it…',                meaning: 'Theo cách tôi nhìn nhận…' },
      ],
    },
    {
      category: 'Khẳng định mạnh',
      items: [
        { phrase: 'I strongly believe that…',         meaning: 'Tôi hoàn toàn tin rằng…' },
        { phrase: "There's no question that…",        meaning: 'Không còn nghi ngờ gì rằng…' },
        { phrase: "I'm confident that…",              meaning: 'Tôi tự tin rằng…' },
        { phrase: 'The data clearly shows…',          meaning: 'Dữ liệu cho thấy rõ ràng…' },
      ],
    },
    {
      category: 'Ngắt lời lịch sự',
      items: [
        { phrase: 'Sorry to interrupt, but…',         meaning: 'Xin lỗi vì ngắt lời, nhưng…' },
        { phrase: "If I may, I'd like to add…",       meaning: 'Nếu được phép, tôi muốn bổ sung…' },
        { phrase: 'Can I jump in here for a second?', meaning: 'Tôi có thể xen vào một chút không?' },
        { phrase: 'Excuse me, could I add something?',meaning: 'Xin lỗi, tôi có thể thêm điều gì không?' },
      ],
    },
    {
      category: 'Yêu cầu làm rõ',
      items: [
        { phrase: 'Just to clarify, are you saying…?', meaning: 'Cho rõ hơn, ý bạn là…?' },
        { phrase: 'Could you elaborate on that?',       meaning: 'Bạn có thể nói thêm về điều đó không?' },
        { phrase: 'What do you mean by…?',             meaning: 'Ý bạn là gì khi nói…?' },
        { phrase: 'So if I understand correctly…',     meaning: 'Vậy nếu tôi hiểu đúng thì…' },
      ],
    },
    {
      category: 'Phản biện khéo léo',
      items: [
        { phrase: 'I understand your point, but…',             meaning: 'Tôi hiểu ý bạn, nhưng…' },
        { phrase: "I see where you're coming from, however…",  meaning: 'Tôi thấy lý do của bạn, tuy nhiên…' },
        { phrase: "I'm not sure I fully agree, because…",      meaning: 'Tôi không chắc đồng ý hoàn toàn, vì…' },
        { phrase: "That's an interesting perspective, but…",   meaning: 'Đó là góc nhìn thú vị, nhưng…' },
      ],
    },
    {
      category: 'Nhờ vả / đề xuất',
      items: [
        { phrase: 'Would it be possible to…?',          meaning: 'Liệu có thể…?' },
        { phrase: 'I was wondering if you could…',      meaning: 'Tôi không biết liệu bạn có thể…' },
        { phrase: 'Could we perhaps…?',                 meaning: 'Chúng ta có thể…?' },
        { phrase: 'Do you think we might be able to…?', meaning: 'Bạn có nghĩ chúng ta có thể…?' },
      ],
    },
    {
      category: 'Kết thúc / tóm tắt',
      items: [
        { phrase: "To summarize what we've discussed…", meaning: 'Tóm tắt lại những gì đã thảo luận…' },
        { phrase: "Let's circle back to…",              meaning: 'Hãy quay lại chủ đề…' },
        { phrase: 'Can we get a consensus on this?',    meaning: 'Chúng ta có thể đồng thuận không?' },
        { phrase: 'Going forward, we should…',          meaning: 'Từ đây trở đi, chúng ta nên…' },
      ],
    },
  ],

  ja: [
    {
      category: '挨拶・開始 (Chào hỏi)',
      items: [
        { phrase: 'お{疲|つか}れ{様|さま}です。',                       meaning: 'Cảm ơn vì công việc hôm nay.' },
        { phrase: 'お{世話|せわ}になっております。',                      meaning: 'Cảm ơn vì sự hợp tác / quan tâm.' },
        { phrase: '{本日|ほんじつ}はよろしくお{願|ねが}いいたします。',   meaning: 'Hôm nay rất mong được hợp tác.' },
        { phrase: 'ご{参加|さんか}いただきありがとうございます。',         meaning: 'Cảm ơn đã tham gia.' },
      ],
    },
    {
      category: '近況・体調 (Hỏi thăm công việc & sức khoẻ)',
      items: [
        { phrase: 'お{体|からだ}の{具合|ぐあい}はいかがですか？',              meaning: 'Sức khoẻ của anh/chị dạo này thế nào ạ?' },
        { phrase: '{最近|さいきん}お{忙|いそが}しいですか？',                  meaning: 'Dạo này anh/chị có bận không?' },
        { phrase: 'お{仕事|しごと}の{方|ほう}はいかがですか？',                meaning: 'Công việc của anh/chị dạo này thế nào ạ?' },
        { phrase: 'ご{無沙汰|ぶさた}しております。お{元気|げんき}ですか？',    meaning: 'Lâu ngày không gặp. Anh/chị có khoẻ không?' },
        { phrase: 'お{体|からだ}に{気|き}をつけてください。',                  meaning: 'Anh/chị nhớ giữ gìn sức khoẻ nhé.' },
        { phrase: 'おかげさまで{元気|げんき}にしております。',                 meaning: 'Nhờ anh/chị quan tâm, tôi vẫn khoẻ ạ.' },
        { phrase: 'お{互|たが}いに{頑張|がんば}りましょうね。',                meaning: 'Cùng nhau cố gắng nhé.' },
      ],
    },
    {
      category: 'あいづち・終助詞 (Lắng nghe & Particle)',
      items: [
        { phrase: 'はい、なるほど。',                                          meaning: 'Vâng, tôi hiểu rồi. — phản hồi khi đang nghe' },
        { phrase: 'おっしゃる{通|とお}りです。',                               meaning: 'Đúng như anh/chị nói. — đồng ý hoàn toàn' },
        { phrase: 'そうなんですか？',                                          meaning: 'Thật vậy sao? — thể hiện ngạc nhiên/quan tâm' },
        { phrase: 'そうですね。',                                              meaning: 'Đúng vậy nhỉ. — ね: tìm đồng ý, tạo kết nối' },
        { phrase: 'いいですね。',                                              meaning: 'Hay đấy nhỉ! — ね tự nhiên hơn いいです' },
        { phrase: 'なるほどですね。',                                          meaning: 'Tôi hiểu rồi nhỉ. — ね nhẹ nhàng, thân thiện' },
        { phrase: '{明日|あした}の{件|けん}ですよ。',                          meaning: 'Là về việc ngày mai đó. — よ: thông báo thông tin MỚI' },
        { phrase: 'ご{確認|かくにん}いただけましたよね？',                      meaning: 'Anh/chị đã xác nhận rồi phải không? — よね: chắc nhưng muốn confirm' },
        { phrase: 'よろしいですよね？',                                        meaning: 'Như vậy ổn phải không? — よね an toàn nhất trong business' },
        { phrase: 'そういうことですよね？',                                    meaning: 'Tức là như vậy đúng không? — よね xác nhận lại ý' },
      ],
    },
    {
      category: '割り込み・追加 (Ngắt lời / thêm ý)',
      items: [
        { phrase: '{失礼|しつれい}ですが、{一点|いってん}よろしいでしょうか？', meaning: 'Xin lỗi, tôi có thể hỏi một điểm không?' },
        { phrase: 'あのう、{少|すこ}しよろしいですか？',                        meaning: 'Ừm, tôi có thể xen vào một chút không?' },
        { phrase: '{実|じつ}は…',                                             meaning: 'Thực ra là…' },
        { phrase: '{少|すこ}しよろしいですか？',                               meaning: 'Cho tôi một chút được không?' },
      ],
    },
    {
      category: '確認・質問 (Xác nhận / hỏi)',
      items: [
        { phrase: '〇〇ということでよろしいでしょうか？',                       meaning: 'Tức là 〇〇, như vậy đúng không ạ?' },
        { phrase: 'ご{確認|かくにん}いただけますでしょうか？',                   meaning: 'Phiền anh/chị xác nhận lại giúp không?' },
        { phrase: 'もう{少|すこ}し{詳|くわ}しくお{聞|き}かせいただけますか？',  meaning: 'Anh/chị có thể nói rõ hơn không?' },
        { phrase: '〇〇についてはいかがでしょうか？',                           meaning: 'Về vấn đề 〇〇, anh/chị nghĩ sao?' },
      ],
    },
    {
      category: '断り・躊躇 (Từ chối lịch sự)',
      items: [
        { phrase: 'それは、ちょっと…',                                         meaning: 'Cái đó thì… (hàm ý khó)' },
        { phrase: '{難|むずか}しいかもしれませんが…',                           meaning: 'Có thể sẽ hơi khó…' },
        { phrase: '{検討|けんとう}いたします。',                                meaning: 'Chúng tôi sẽ xem xét. (thường = không)' },
        { phrase: '{前向|まえむ}きに{検討|けんとう}いたします。',               meaning: 'Chúng tôi sẽ xem xét tích cực.' },
      ],
    },
    {
      category: '依頼・提案 (Nhờ vả / đề xuất)',
      items: [
        { phrase: 'お{願|ねが}いできますでしょうか？',                          meaning: 'Nhờ anh/chị được không?' },
        { phrase: 'ご{検討|けんとう}いただければ{幸|さいわ}いです。',           meaning: 'Rất biết ơn nếu anh/chị xem xét.' },
        { phrase: 'もしよろしければ…',                                         meaning: 'Nếu anh/chị không phiền thì…' },
        { phrase: 'ご{都合|つごう}はいかがでしょうか？',                        meaning: 'Thời gian của anh/chị thế nào?' },
      ],
    },
    {
      category: 'まとめ・締め (Kết thúc)',
      items: [
        { phrase: '{以上|いじょう}でございます。',                              meaning: 'Tôi xin hết. (sau khi trình bày)' },
        { phrase: 'いかがでしょうか？',                                         meaning: 'Anh/chị nghĩ sao ạ?' },
        { phrase: '{何|なに}かご{意見|いけん}はございますか？',                  meaning: 'Có ý kiến gì không ạ?' },
        { phrase: 'よろしくお{願|ねが}いいたします。',                          meaning: 'Rất mong nhận được sự hợp tác.' },
      ],
    },
    {
      category: '行動の文型 · Action Grammar',
      items: [
        { phrase: '～てください',         meaning: 'Yêu cầu lịch sự — "Làm ơn hãy…" / {窓|まど}を{閉|し}めてください。' },
        { phrase: '～てもいい',           meaning: 'Xin phép / cho phép — "Được không nếu…?" / ここに{座|すわ}ってもいいですか？' },
        { phrase: '～なければならない',   meaning: 'Bắt buộc, phải làm — "Phải…" / レポートを{出|だ}さなければならない。' },
        { phrase: '～ている',             meaning: 'Đang diễn ra / trạng thái kéo dài — "Đang…" / {会議|かいぎ}をしています。' },
        { phrase: '～たことがある',       meaning: 'Từng có kinh nghiệm — "Đã từng…" / {日本|にほん}に{行|い}ったことがある。' },
      ],
    },
    {
      category: '感情の文型 · Emotion Grammar',
      items: [
        { phrase: '～たい',         meaning: 'Muốn làm gì (ngôi 1) — "Muốn…" / {日本語|にほんご}を{話|はな}したい。' },
        { phrase: '～ほしい',       meaning: 'Muốn có / muốn người khác làm — "Muốn được…" / もっと{時間|じかん}がほしい。' },
        { phrase: '～そう',         meaning: 'Trông có vẻ (cảm quan trực tiếp) — "Có vẻ…" / {雨|あめ}が{降|ふ}りそう。' },
        { phrase: '～ようだ',       meaning: 'Có vẻ / giống như (suy luận khách quan) — "Dường như…" / {彼|かれ}は{疲|つか}れているようだ。' },
        { phrase: '～かもしれない', meaning: 'Có thể (không chắc ~50%) — "Có lẽ…" / {明日|あした}は{休|やす}みかもしれない。' },
        { phrase: '～らしい',       meaning: 'Nghe nói / có vẻ (thông tin từ bên ngoài) — "Nghe nói…" / {彼|かれ}は{来|こ}ないらしい。' },
        { phrase: '～と思う',       meaning: 'Ý kiến cá nhân — "Tôi nghĩ…" / これは{難|むずか}しいと{思|おも}う。' },
        { phrase: '～気がする',     meaning: 'Linh cảm / cảm giác mơ hồ — "Tôi có cảm giác…" / {何|なに}か{忘|わす}れた{気|き}がする。' },
      ],
    },
  ],
};
