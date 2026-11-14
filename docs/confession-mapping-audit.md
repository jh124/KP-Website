# Confession comparison: mapping audit

The comparison now contains 99 topics, 1,146 distinct source passages, and 574 document/topic comparisons. The review used the corrected Kidderminster Press Reader currently offered by the site. Topic assignments are explicit reference lists, rather than inherited text-classification results.

## Source and coverage

All prose and inline emphasis are extracted from the corrected EPUB. Both the EPUB and screen PDF are pinned by SHA-256 in the generated data and verified against the downloads. Every passage has an opening page found in the matching PDF; there are no approximate page anchors. The biblical-books table preserves the printed column order after a word-and-punctuation check against the extraction.

| Document | Covered references |
| --- | --- |
| Augsburg | Articles 1–28, preface, doctrinal transition, conclusion |
| French | Articles 1–40 and preface |
| Scots | Chapters 1–25 as represented in this Reader |
| Belgic | Articles 1–37 |
| Heidelberg | Questions 1–129 |
| Second Helvetic | Chapters 1–30, divided at their own subheadings |
| Thirty-Nine Articles | Articles 1–39 |
| Dort | All 59 articles, 34 rejections, and conclusion |
| Westminster Confession | All 172 paragraphs in chapters 1–33 |
| Larger Catechism | Questions 1–196 |
| Shorter Catechism | Questions 1–107 from Appendix B |

Coverage describes this Reader, not an independent reconstruction of every historical document. Some Scots chapters in the supplied edition are fragments: chapter 14 begins with “assurance but the invention,” and chapter 25 contains closing doxology and prayer. These are placed according to their actual surviving contents; no missing prose is silently supplied from another translation. Appendix A contains the ecumenical creeds themselves; the comparison continues to compare the eleven original documents, and the Creeds topic includes their own relevant statements.

## Changes to the taxonomy and assignments

| Area | Review and resulting change |
| --- | --- |
| God | Merge being and attributes; add the missing Augsburg, Scots, Helvetic, and Westminster Trinity treatments. Add a focused Holy Spirit topic. Westminster 2.3 belongs under the Trinity. |
| Scripture | Separate canon, authority, sufficiency, and interpretation. Add Thirty-Nine Articles 6 to canon. Remove the Shorter Catechism from Creeds: its questions about Scripture do not discuss the creeds. Retain the corrected Heidelberg 22 before 23. |
| Covenants | Fold the unhelpful general bucket into the covenant of grace. Move French 13 to Christ the mediator and union with Christ; its content concerns salvation in Christ, not covenant administration. |
| Christ | Review all incarnation, two-nature, office, humiliation, exaltation, and intercession texts. Restore and assign the entire Helvetic chapter 11. Retain coherent whole historical articles when they genuinely discuss more than one of these subjects. |
| Sin and salvation | Separate fall, original sin, actual sin and punishment. Add union with Christ. Separate sanctification from good works, reward, and merit. Add focused Dort assurance and election passages to Assurance. |
| Law | Replace the miscellaneous law bucket with nature, use, and summary/interpretation. Merge the duplicate Fourth Commandment and Sabbath topics; keep holy days and fasting separate. Assign catechism questions 149–152 on inability, degrees, and punishment of sin to their actual subjects. |
| Church | Split church nature, marks, headship/authority, ministry, discipline, communion, councils, and customs. Heidelberg 55 belongs under communion; Westminster 26 and 31 no longer form one undifferentiated block. Add church possessions and care for the poor. |
| Sacraments | Add infant baptism and preparation/admission to the Supper. Place Shorter Catechism 96 under the Supper, rather than general sacramental doctrine. French 37–38 discuss both sacraments and are cross-listed where appropriate. |
| Worship | Separate images from invocation of saints. Put Helvetic 23’s Singing paragraph under Singing. Westminster 21.3 is Prayer, not Singing. Oaths use Helvetic 5.6 and Thirty-Nine Articles 39; the latter no longer appears under monastic vows. |
| Prayer | Separate general prayer from the Lord’s Prayer, with a pattern/preface topic, six petition topics, and conclusion. Align Heidelberg, Larger, and Shorter Catechism questions petition by petition. |
| Christian life | Separate lawful oaths, celibacy/monastic vows, and marriage/family. French 40 is relevant to obedience to magistrates as well as property; its former single placement missed its main argument. |
| Last things | Replace the four near-identical broad copies with exact assignments: Westminster 32.1 and Larger 84–86 at Death, Westminster 32.2–3 and Larger 87 at Resurrection, Westminster 33 and Larger 88–90 at Judgment. Preserve intentional whole-article overlap in Augsburg 17 and Belgic 37. |
| Historical matter | Move prefaces and conclusions to Historical texts. Separate Augsburg’s summary and introduction to corrected abuses from Article 21’s treatment of saints. Put the Scots chapter 25 closing prayer here, not under church property. |
| Pastoral subjects | Replace the catch-all with catechesis and visiting the sick. Homilies belong with the Word read/preached, not with care of the dead. |

## Intentional cross-listing

A complete article or numbered paragraph may address several doctrines. Cross-listing is retained when its actual contents support each topic: for example, Augsburg 17 and Belgic 37 discuss resurrection, judgment, and eternal destinies; Westminster 8.4 discusses humiliation and exaltation. Shared references render one canonical source passage, so cross-listing cannot introduce divergent wording. There are no duplicate reference IDs within a single topic.

## Complete assignment manifest

Selectors use the document keys in the application. A range is inclusive; `*` means all extracted units in that chapter. The final numeric component for Second Helvetic units is an internal subheading index, not a historical paragraph number. All selectors are expanded and checked during the build.

| Topic | Source selectors |
| --- | --- |
| Man's chief end and only comfort | `hc.1-2`, `wlc.1`, `wsc.1` |
| The ecumenical creeds | `fc.5`, `bc.9`, `hc.22-23`, `shc.11.17-18`, `39a.8` |
| Revelation and the knowledge of God | `fc.2`, `bc.2-3`, `wcf.1.1`, `wlc.2` |
| The canon of Scripture | `fc.3`, `bc.4`, `bc.6`, `shc.1.1`, `shc.1.6-7`, `39a.6`, `wcf.1.2-3`, `wlc.3` |
| The authority of Scripture | `fc.4-5`, `sc.19`, `bc.5`, `shc.1.1`, `shc.1.3-5`, `wcf.1.4-5`, `wcf.1.10`, `wlc.4`, `wsc.2` |
| The sufficiency and necessity of Scripture | `fc.5`, `sc.19`, `bc.7`, `shc.1.2`, `39a.6`, `wcf.1.1`, `wcf.1.6-8`, `wlc.5`, `wsc.2-3` |
| The interpretation of Scripture | `shc.2.1-4`, `39a.20`, `wcf.1.7-10` |
| God's being and attributes | `ac.1`, `fc.1`, `sc.1`, `bc.1`, `shc.3.1`, `wcf.2.1-2`, `wlc.6-8`, `wsc.4-5` |
| The Holy Trinity | `ac.1`, `fc.6`, `sc.1`, `bc.8-11`, `hc.24-25`, `shc.3.1-3`, `39a.1`, `39a.5`, `wcf.2.3`, `wlc.9-11`, `wsc.6` |
| The Holy Spirit | `fc.6`, `fc.21`, `sc.12`, `bc.11`, `hc.53`, `39a.5`, `wlc.11` |
| God's eternal decree | `wcf.3.1-4`, `wcf.3.8`, `wlc.12-14`, `wsc.7-8` |
| Election in Christ | `fc.12`, `sc.8`, `bc.16`, `shc.10.*`, `39a.17`, `dort.1.a6-a14`, `dort.1.a16-a18`, `dort.1.r1-r7`, `dort.1.r9`, `wcf.3.3-6`, `wcf.3.8`, `wlc.13`, `wsc.20` |
| Reprobation | `fc.12`, `bc.16`, `dort.1.a6`, `dort.1.a15`, `dort.1.r8`, `wcf.3.3-4`, `wcf.3.7-8`, `wlc.13` |
| The creation of the world | `fc.7`, `bc.12`, `hc.26`, `shc.7.1-2`, `wcf.4.1`, `wlc.14-15`, `wsc.8-9` |
| Angels and demons | `fc.7`, `bc.12`, `shc.7.3`, `wlc.16`, `wlc.19` |
| Man created in the image of God | `sc.2`, `bc.14`, `shc.7.4-5`, `wcf.4.2`, `wlc.17`, `wsc.10` |
| Divine providence | `fc.8`, `bc.13`, `hc.27-28`, `shc.6.*`, `wcf.5.*`, `wlc.18-20`, `wsc.11-12` |
| The fall of man | `fc.9-10`, `sc.3`, `bc.14`, `hc.6-7`, `shc.8.1`, `dort.3.a1`, `wcf.6.1-3`, `wlc.21-23`, `wsc.13`, `wsc.15-17` |
| Original sin and human corruption | `ac.2`, `fc.9-11`, `sc.3`, `bc.14-15`, `39a.9`, `hc.7-9`, `shc.8.2`, `shc.8.4`, `shc.8.6`, `dort.3.a2-a3`, `dort.3.r1-r2`, `wcf.6.2-5`, `wlc.25-26`, `wsc.18` |
| Actual sin, guilt, and punishment | `ac.19`, `fc.11`, `hc.3-5`, `hc.9-11`, `shc.8.3`, `shc.8.5`, `shc.8.7-8`, `dort.1.a1`, `dort.2.a1`, `wcf.6.4-6`, `wlc.24`, `wlc.27-29`, `wlc.149-152`, `wsc.14`, `wsc.19`, `wsc.82-84` |
| Free will and human inability | `ac.18`, `fc.9`, `bc.14`, `hc.8`, `shc.9.*`, `39a.10`, `dort.3.a3-a5`, `dort.3.a16`, `dort.3.r3-r5`, `dort.3.r8`, `wcf.9.*` |
| The covenant of works | `wcf.7.1-2`, `wlc.20`, `wlc.92`, `wsc.12` |
| The covenant of grace and the promise of redemption | `sc.4`, `bc.17`, `shc.13.1-3`, `shc.13.7`, `39a.7`, `wcf.7.3-6`, `wlc.30-35`, `wsc.20` |
| Christ's person and incarnation | `ac.3`, `fc.14`, `sc.6-7`, `bc.10`, `bc.18`, `hc.29`, `hc.33-36`, `shc.11.1-4`, `39a.2`, `39a.15`, `wcf.8.2-3`, `wlc.36-37`, `wlc.41`, `wsc.21-22` |
| The two natures of Christ | `fc.14-15`, `sc.7`, `bc.19`, `hc.16-18`, `hc.47-48`, `shc.11.5-9`, `shc.11.11`, `wcf.8.2`, `wcf.8.7`, `wlc.38-40` |
| Christ the only mediator and saviour | `fc.13`, `sc.7`, `bc.26`, `hc.12-18`, `hc.29-30`, `hc.34`, `shc.11.16`, `39a.18`, `wcf.8.1`, `wcf.8.5-6`, `wcf.8.8`, `wlc.36`, `wlc.38-41`, `wlc.57`, `wlc.59-60`, `wsc.21` |
| Christ's offices: prophet, priest, and king | `bc.21`, `hc.31-32`, `shc.11.16`, `wcf.8.1`, `wcf.8.3`, `wlc.42-45`, `wsc.23-26` |
| Christ's humiliation, death, and atonement | `ac.3`, `fc.16-17`, `sc.9`, `bc.20-21`, `hc.36-44`, `shc.11.10`, `shc.11.15`, `39a.2-3`, `39a.31`, `dort.2.*`, `wcf.8.4-6`, `wlc.46-50`, `wsc.27` |
| Christ's resurrection and ascension | `ac.3`, `fc.16`, `sc.10-11`, `hc.45-51`, `shc.11.12-15`, `39a.4`, `wcf.8.4`, `wlc.51-54`, `wsc.28` |
| Christ's intercession | `sc.11`, `bc.26`, `hc.49-51`, `shc.5.2`, `wcf.8.4`, `wcf.8.8`, `wlc.54-55`, `wsc.25`, `dort.5.r9` |
| Union and communion with Christ | `fc.13`, `fc.36`, `hc.32`, `shc.16.4`, `wcf.26.1`, `wlc.58`, `wlc.65-66`, `wlc.69`, `wsc.29-30`, `wsc.32` |
| Effectual calling, regeneration, and conversion | `ac.5`, `fc.21-22`, `sc.12`, `shc.9.5-7`, `shc.14.0-3`, `dort.3.a6-a17`, `dort.3.r6-r9`, `wcf.10.*`, `wlc.57-59`, `wlc.67-68`, `wsc.29-31` |
| Saving faith | `fc.20-21`, `hc.20-22`, `hc.59-61`, `shc.16.1-4`, `39a.16`, `dort.3.a14`, `dort.5.r7`, `wcf.14.*`, `wlc.72-73`, `wsc.86` |
| Justification and the forgiveness of sins | `ac.4`, `fc.17-18`, `fc.20`, `sc.15`, `bc.22-23`, `hc.56`, `hc.59-64`, `shc.15.*`, `39a.11`, `wcf.11.*`, `wlc.70-73`, `wlc.77`, `wsc.33` |
| Adoption | `fc.17`, `fc.19`, `hc.33`, `wcf.12.1`, `wlc.74`, `wsc.34` |
| Repentance, confession, and absolution | `ac.11-12`, `ac.25`, `hc.87-90`, `shc.14.*`, `39a.16`, `wcf.15.*`, `wlc.76`, `wsc.87` |
| Sanctification and the renewal of life | `ac.6`, `fc.22`, `sc.13`, `bc.24`, `hc.86-91`, `hc.114`, `shc.9.5-7`, `shc.14.12`, `wcf.13.*`, `wlc.75`, `wlc.77-78`, `wsc.35` |
| Good works, reward, and merit | `ac.6`, `ac.20`, `fc.22`, `sc.13-14`, `bc.24`, `hc.62-64`, `hc.86-91`, `shc.16.4-13`, `39a.12-14`, `wcf.16.*` |
| The perseverance of the saints | `fc.21`, `39a.16`, `dort.1.r6`, `dort.5.a1-a8`, `dort.5.a14-a15`, `dort.5.r1-r4`, `dort.5.r7-r9`, `wcf.17.*`, `wlc.79`, `wsc.36` |
| Assurance of grace and salvation | `hc.1`, `hc.21`, `shc.10.8-9`, `39a.17`, `dort.1.a12-a13`, `dort.1.a16`, `dort.1.r7`, `dort.5.a9-a13`, `dort.5.r5-r6`, `wcf.18.*`, `wlc.80-81`, `wsc.36` |
| The moral, ceremonial, and judicial law | `fc.23`, `bc.25`, `shc.12.1-3`, `39a.7`, `wcf.19.1-5`, `wlc.91-93`, `wsc.39-40` |
| The use of the law and its fulfilment in Christ | `fc.23`, `sc.15`, `hc.3-5`, `hc.114-115`, `shc.12.4-7`, `wcf.19.5-7`, `wlc.94-97`, `wlc.149`, `wsc.82` |
| The Ten Commandments: summary and interpretation | `hc.92-93`, `shc.12.2`, `wcf.19.2`, `wlc.98-102`, `wsc.41-44` |
| The first commandment | `hc.94-95`, `wlc.103-106`, `wsc.45-48` |
| The second commandment | `hc.96-98`, `wlc.107-110`, `wsc.49-52` |
| The third commandment | `hc.99-102`, `wlc.111-114`, `wsc.53-56` |
| The fourth commandment and the Lord's Day | `hc.103`, `shc.24.1-3`, `wcf.21.7-8`, `wlc.115-121`, `wsc.57-62` |
| The fifth commandment | `hc.104`, `wlc.122-133`, `wsc.63-66` |
| The sixth commandment | `hc.105-107`, `wlc.134-136`, `wsc.67-69` |
| The seventh commandment | `hc.108-109`, `wlc.137-139`, `wsc.70-72` |
| The eighth commandment | `hc.110-111`, `wlc.140-142`, `wsc.73-75` |
| The ninth commandment | `hc.112`, `wlc.143-145`, `wsc.76-78` |
| The tenth commandment | `hc.113`, `wlc.146-148`, `wsc.79-81` |
| The church and its membership | `ac.7-8`, `fc.26-28`, `sc.5`, `sc.16`, `bc.27-28`, `hc.54`, `shc.17.1-15`, `shc.17.22-26`, `39a.19`, `wcf.25.1-5`, `wlc.61-65` |
| The marks of the true church | `ac.7-8`, `fc.27-28`, `sc.18`, `bc.29`, `shc.17.21-26`, `wcf.25.3-5` |
| Christ's headship and the church's authority | `ac.28`, `fc.30`, `bc.32`, `shc.17.16-20`, `shc.18.22-28`, `39a.20`, `wcf.25.6`, `wcf.30.1-2` |
| Ministry and church officers | `ac.14`, `fc.25`, `fc.29-31`, `sc.22`, `bc.30-31`, `shc.18.*`, `39a.23`, `39a.26`, `39a.36`, `wcf.30.1` |
| Church discipline and the keys of the kingdom | `fc.33`, `bc.32`, `hc.82-85`, `shc.14.7-11`, `shc.18.25`, `shc.18.30`, `39a.33`, `wcf.30.*`, `wlc.173` |
| The communion of saints | `hc.55`, `shc.17.3`, `shc.17.7`, `shc.17.10`, `wcf.26.*`, `wlc.69`, `wlc.82-83` |
| Councils and synods | `sc.20`, `shc.2.2-3`, `shc.18.32`, `39a.21`, `wcf.31.*` |
| Church customs and things indifferent | `ac.15`, `ac.26`, `fc.32-33`, `bc.32`, `shc.2.4`, `shc.17.27`, `shc.27.*`, `39a.34`, `wcf.20.2` |
| Church possessions and care for the poor | `fc.29`, `bc.30`, `shc.18.33`, `shc.28.*`, `wcf.26.2-3` |
| Catechesis and the instruction of children | `shc.25.1`, `shc.29.6`, `wlc.156-157` |
| Pastoral care and visiting the sick | `shc.25.2` |
| The gospel and the free offer of grace | `ac.5`, `hc.19`, `shc.13.*`, `dort.1.a2-a5`, `dort.2.a5`, `dort.3.a5-a9`, `wcf.7.3`, `wlc.153`, `wsc.85` |
| The Word read and preached | `ac.5`, `fc.25`, `shc.1.4-5`, `shc.18.3`, `shc.18.29`, `39a.35`, `wcf.21.5`, `wlc.155-160`, `wsc.89-90` |
| The outward means of grace | `hc.65`, `shc.1.4-5`, `dort.3.a17`, `dort.5.a14`, `wcf.14.1`, `wlc.154`, `wsc.88` |
| The sacraments in general | `ac.13`, `fc.34`, `fc.37-38`, `sc.21-22`, `bc.33`, `hc.65-68`, `shc.19.*`, `39a.25-26`, `wcf.27.*`, `wlc.161-164`, `wlc.176-177`, `wsc.91-93` |
| Baptism | `ac.9`, `fc.35`, `fc.38`, `sc.23`, `bc.34`, `hc.69-74`, `shc.20.*`, `39a.27`, `wcf.28.*`, `wlc.165-167`, `wsc.94-95` |
| Infant baptism and the children of believers | `ac.9`, `fc.35`, `sc.23`, `bc.34`, `hc.74`, `shc.20.8`, `39a.27`, `wcf.28.4`, `wlc.166`, `wsc.95` |
| The Lord's Supper | `ac.10`, `ac.22`, `ac.24`, `fc.36-38`, `bc.35`, `hc.75-80`, `shc.21.1-13`, `shc.21.15`, `39a.28-31`, `wcf.29.*`, `wlc.168-170`, `wlc.176-177`, `wsc.96` |
| Preparation and admission to the Lord's Supper | `fc.37`, `hc.81-82`, `shc.21.10-11`, `shc.21.14`, `wcf.29.7-8`, `wlc.171-175`, `wsc.97` |
| The worship of God and public assemblies | `sc.14`, `fc.26`, `shc.5.1`, `shc.22.1-6`, `wcf.21.1-2`, `wcf.21.5-6`, `wlc.108-109` |
| Images in worship | `hc.96-98`, `shc.4.*`, `wcf.21.1`, `wlc.109` |
| The invocation and veneration of saints | `ac.21`, `fc.24`, `bc.26`, `hc.30`, `hc.102`, `shc.5.2-5`, `39a.22`, `wcf.21.2`, `wlc.179-181` |
| Holy days, fasting, and food | `ac.26`, `shc.24.4-10`, `wcf.21.5` |
| Singing and worship in a known language | `shc.22.7`, `shc.23.1`, `shc.23.5`, `39a.24`, `wcf.21.5` |
| Prayer | `fc.19`, `fc.24`, `bc.26`, `hc.116-118`, `shc.5.2`, `shc.23.2-4`, `shc.23.6`, `wcf.21.3-4`, `wlc.178-185`, `wsc.98` |
| The Lord's Prayer: pattern and preface | `hc.119-121`, `wlc.186-189`, `wsc.99-100` |
| The first petition: Hallowed be thy name | `hc.122`, `wlc.190`, `wsc.101` |
| The second petition: Thy kingdom come | `hc.123`, `wlc.191`, `wsc.102` |
| The third petition: Thy will be done | `hc.124`, `wlc.192`, `wsc.103` |
| The fourth petition: Give us this day our daily bread | `hc.125`, `wlc.193`, `wsc.104` |
| The fifth petition: Forgive us our debts | `hc.126`, `wlc.194`, `wsc.105` |
| The sixth petition: Lead us not into temptation | `hc.127`, `wlc.195`, `wsc.106` |
| The conclusion of the Lord's Prayer | `hc.128-129`, `wlc.196`, `wsc.107` |
| Christian liberty and liberty of conscience | `ac.26`, `fc.33`, `shc.24.8-9`, `shc.27.3`, `wcf.20.*` |
| Lawful oaths and vows | `hc.101-102`, `shc.5.6`, `39a.39`, `wcf.22.*`, `wlc.112-114` |
| Celibacy and monastic vows | `ac.23`, `ac.27`, `shc.18.15`, `shc.29.1`, `39a.14`, `39a.32`, `wcf.22.7`, `wcf.24.2` |
| Marriage, divorce, and family life | `ac.23`, `shc.29.*`, `39a.32`, `wcf.24.*`, `wlc.138-139` |
| The civil magistrate and the duty of subjects | `ac.16`, `ac.28`, `fc.39-40`, `sc.24`, `bc.36`, `shc.30.*`, `39a.37`, `wcf.23.*` |
| Property and Christian charity | `fc.40`, `hc.110-111`, `39a.38`, `wcf.26.2-3`, `wlc.141-142` |
| Death and the intermediate state | `sc.17`, `hc.42`, `shc.7.5`, `shc.26.3`, `wcf.32.1`, `wlc.84-86`, `wsc.37` |
| The resurrection of the dead | `ac.17`, `bc.37`, `hc.57`, `shc.11.13-14`, `wcf.32.2-3`, `wlc.87`, `wsc.38` |
| The last judgment and the return of Christ | `ac.17`, `sc.11`, `bc.37`, `hc.52`, `shc.11.13-14`, `wcf.33.*`, `wlc.56`, `wlc.88-90` |
| Eternal life and eternal punishment | `ac.17`, `sc.17`, `bc.37`, `hc.58`, `shc.11.13-14`, `wcf.33.2`, `wlc.29`, `wlc.82-83`, `wlc.89-90`, `wsc.38` |
| Burial, purgatory, and prayers for the dead | `fc.24`, `shc.26.1-2`, `shc.26.4-5`, `39a.22`, `wcf.21.4`, `wcf.32.1` |
| Prefaces and introductions | `ac.preface`, `fc.preface` |
| Conclusions and closing prayers | `ac.transition`, `ac.conclusion`, `sc.25`, `dort.conclusion` |
