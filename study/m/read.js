(()=>{
"use strict";
// The reading machine: an adaptive silent-reading and comprehension trainer for Years 7–13.
// Every text and question here is original, written for assembl. Levels are approximate.
// Question format: [skill, question, [correct, wrong, wrong, wrong], why, evidence]. Options are shuffled on screen.

const TEXTS=[
/* ───────────── BAND 1 · Years 7–8 ───────────── */
{id:"root",title:"The Root Section",band:1,worlds:["bike"],genre:"Narrative",subject:"",
blurb:"Mia has walked the scariest forty metres of the forest trail for years. Today her cousin has a different idea.",
paras:[
"Mia had ridden the forest trails above Rotorua every Saturday since she was nine. She knew every berm on the easy loops and every puddle that never quite dried. But there was one part of the black track she always walked: the Root Section.",
"It was only forty metres long. From the top it looked like a staircase that someone had dropped and never picked up. Thick redwood roots crossed the trail in every direction, slick and dark, and the line between them twisted twice before the bottom.",
"“You’ve got the skills,” her cousin Tama said, stopping beside her. “Your head just hasn’t caught up with your hands yet.”",
"Mia didn’t answer. Her stomach felt like it was full of bees.",
"Tama didn’t push. Instead, he laid his bike in the ferns and walked the section with her, slowly, the way you would read a hard page twice. He pointed at a flat spot between two roots. “Eyes here, not on the roots. Bikes go where you look.” He showed her where to let the brakes off so the wheels could roll over the bumps instead of skidding. “Brake before the roots, not on them,” he said. “Wet roots and locked wheels don’t get along.”",
"They walked it three times. On the third walk, Mia noticed something surprising. The section wasn’t one huge scary thing. It was five small things in a row: a drop, a left turn, a big root, a right turn, and the run-out. She could do each one of those.",
"She pushed her bike back to the top. Her hands were sweaty inside her gloves. She took one long breath, the kind that goes all the way down to your shoes, and rolled in.",
"Drop. Look left. Off the brakes. Over the big root, where the back wheel bucked but held. Right. And then she was on the smooth dirt of the run-out, the forest rushing past, her heart thumping like a drum.",
"Tama was cheering somewhere behind her. Mia skidded to a stop and looked back up at the roots. They looked exactly the same as before. She was the thing that had changed."],
vocab:[["berm","A banked corner on a trail, built up like a curved wall of dirt so you can lean into it.","She leaned hard into the berm and shot out of the corner."],
["slick","Smooth and slippery.","After the rain, the footpath was slick with wet leaves."],
["bucked","Jumped or kicked up suddenly, like a horse does.","The trolley bucked when its wheel hit the kerb."],
["run-out","The flat, safe stretch at the end of a jump or hard section, where you can slow down.","He landed the jump and coasted along the run-out."]],
qs:[
["lit","How long was the Root Section?",["Forty metres","Four hundred metres","Five metres","Nine metres"],"The writer tells us directly: “It was only forty metres long.” The word “only” hints that it is short but feels much bigger to Mia.","It was only forty metres long."],
["voc","The roots are described as “slick and dark”. What does slick mean here?",["Smooth and slippery","Clever and quick","Thin and sharp","Soft and mossy"],"Later Tama warns that “wet roots and locked wheels don’t get along”, which tells us the roots are slippery, not sharp or soft.","Thick redwood roots crossed the trail in every direction, slick and dark"],
["inf","Why does Tama say, “Your head just hasn’t caught up with your hands yet”?",["He thinks Mia can ride it, but fear is holding her back","He thinks Mia needs more practice on easy trails","He is worried Mia’s hands are too sore to brake","He wants Mia to ride without thinking at all"],"Just before this he says “You’ve got the skills.” Her hands (her riding skill) are ready; her head (her confidence) is not yet.","Your head just hasn’t caught up with your hands yet."],
["main","What did Mia realise on the third walk?",["The section was five small parts she could each manage","The roots were not as slippery as they looked","There was an easier line around the roots","Tama had ridden it many times before"],"Breaking the section into “five small things in a row” is the turning point. She says, “She could do each one of those.”","It was five small things in a row"],
["pur","The ride is written in tiny bits: “Drop. Look left. Off the brakes.” Why?",["To make the reading feel as quick as the ride, one move at a time","Because Mia forgot most of the ride","To show Mia talking to Tama","To list the official rules of mountain biking"],"Short, clipped sentences speed up the reading and match each quick move on the trail. Writers change sentence length to change pace.","Drop. Look left. Off the brakes."],
["eva","Which of Tama’s tips does the ride show actually working?",["Brake before the roots so the wheels can roll over","Ride as fast as possible","Look down at each root","Keep the brakes on the whole way"],"In the ride she goes “Off the brakes” and over the big root, where the wheel “bucked but held”. That matches “Brake before the roots, not on them.”","Over the big root, where the back wheel bucked but held."],
["inf","The last line says, “She was the thing that had changed.” What does it mean?",["Mia’s confidence had grown, even though the trail was the same","Mia had grown taller over the summer","Mia had swapped to a different bike","Mia had changed her mind and walked down"],"The roots “looked exactly the same as before”, so the change is inside Mia: she is now someone who rides it.","She was the thing that had changed."]]},

{id:"tides",title:"Two Tides a Day",band:1,worlds:["sea"],genre:"Explanation",subject:"Science",
blurb:"Why does the sea creep out at lunchtime and come back by tea? Meet the Moon’s invisible pull.",
paras:[
"If you spend a whole day at the beach, you will notice something strange. In the morning the waves might be lapping at the sand dunes. By lunchtime the water has crept far out, leaving rock pools full of crabs and anemones. By evening it is back again. This rise and fall of the sea is called the tide, and it happens almost everywhere along the coast of Aotearoa.",
"The main cause of the tide is the Moon. Everything that has mass pulls on everything else, and this pull is called gravity. The Moon is much smaller than Earth, but it is close enough for its gravity to tug on our oceans. The side of Earth facing the Moon is pulled a little more strongly than the centre of Earth, so the water there heaps up into a bulge.",
"Here is the surprising part. There is a second bulge on the opposite side of Earth, facing away from the Moon. On that side, the Moon’s pull on the water is weaker than its pull on the centre of Earth, so the water is left behind and forms a bulge too. As Earth spins, your beach passes through both bulges. That is why most places get two high tides and two low tides each day.",
"The tides also arrive about fifty minutes later each day. This is because the Moon is moving along its orbit while Earth spins, so Earth has to turn a little extra to catch up with it. A full cycle of two high tides takes about 24 hours and 50 minutes.",
"The Sun matters too. When the Sun, Moon and Earth line up, at new moon and full moon, their pulls add together. The high tides are higher and the low tides are lower. These are called spring tides, even though they happen all year round. When the Sun and Moon pull at right angles, at half moon, the tides are smaller. These are called neap tides.",
"Tides matter to anyone who fishes, sails, surfs or explores rock pools. In some places, such as Nelson, the sea can rise and fall around four metres on a big spring tide. Before you head out, check a tide table. The sea always comes back."],
vocab:[["gravity","The invisible pull between things that have mass.","Gravity is why a dropped ball falls to the ground."],
["bulge","A part that swells outwards.","His pocket had a bulge where he had stuffed his phone."],
["orbit","The curved path one object takes around another in space.","The Moon takes about a month to complete one orbit of Earth."],
["anemones","Soft sea animals that look like flowers and stick to rocks.","The anemones closed up when Ari touched them gently."]],
qs:[
["lit","What is the main cause of the tide?",["The Moon’s gravity","Wind pushing the water","Earth spinning on its own","Rivers flowing into the sea"],"Paragraph 2 opens with the answer: “The main cause of the tide is the Moon.” The rest of the paragraph explains how its gravity tugs on the oceans.","The main cause of the tide is the Moon."],
["voc","In the morning the water is high, but “by lunchtime the water has crept far out”. What does crept suggest?",["It moved slowly and quietly","It moved suddenly with a crash","It disappeared completely","It became very cold"],"To creep is to move slowly and quietly. Tides change gradually over hours, not in one rush.","By lunchtime the water has crept far out"],
["str","Why does a beach get two high tides a day?",["Earth spins through two bulges of water, one on each side","The Moon goes round Earth twice a day","The Sun makes one high tide and the Moon makes the other","The wind changes direction at midday"],"Paragraph 3 explains the second bulge on the far side. As Earth spins, your beach passes through both bulges.","As Earth spins, your beach passes through both bulges."],
["inf","High tide is at 9:00 am on Monday. About when is the morning high tide on Tuesday?",["About 9:50 am","Exactly 9:00 am","About 8:10 am","About 9:00 pm"],"The text says tides “arrive about fifty minutes later each day”, so add 50 minutes to 9:00 am.","The tides also arrive about fifty minutes later each day."],
["lit","What does the text tell us about spring tides?",["They happen at new and full moon, all year round","They only happen in spring","They are smaller than neap tides","They happen when the Sun and Moon pull at right angles"],"Spring tides happen when the Sun, Moon and Earth line up, and the text points out they happen “all year round”, not just in spring.","These are called spring tides, even though they happen all year round."],
["str","How is paragraph 5 organised?",["It compares two kinds of tide and gives the cause of each","It tells a story in time order","It gives an opinion and then reasons","It lists steps for reading a tide table"],"It describes spring tides (Sun and Moon lined up) and then neap tides (pulling at right angles): a compare-and-contrast structure.","The Sun matters too."],
["pur","Why does the writer end with “The sea always comes back”?",["To finish with a short, memorable reminder that tides are a regular cycle","To warn that tsunamis are common","To argue that people should stay away from beaches","To start a new topic about waves"],"A short final line sticks in your memory. It sums up the big idea: the tide is a cycle that repeats.","The sea always comes back."],
["main","Which sentence best sums up the whole text?",["Tides are caused mainly by the Moon’s gravity, helped by the Sun, and follow a regular pattern","Nelson has the biggest tides in the world","Rock pools are full of interesting animals","Tide tables are hard to read"],"Each paragraph adds to one big idea: what causes tides and the pattern they follow. The other options are small details or not in the text.","The main cause of the tide is the Moon."]]},

{id:"kereru",title:"The Bird That Plants Forests",band:1,worlds:["animals"],genre:"Explanation",subject:"Science",
blurb:"A noisy, hungry, sometimes wobbly pigeon is one of the most important gardeners in Aotearoa.",
paras:[
"You usually hear a kererū before you see it. Its wings make a loud whoosh, whoosh as it flies between trees, like someone shaking out a heavy blanket. Then it lands on a branch, a big round bird with a white chest and shiny green and purple feathers, and it starts to eat.",
"Kererū, also called the New Zealand pigeon, eat a lot of fruit. They also eat leaves, buds and flowers, but fruit is their favourite. In autumn they gorge on the fruit of trees such as taraire, tawa, pūriri and miro. A kererū can swallow a fruit whole, even one as big as a grape.",
"This is where kererū become very important. The seed inside the fruit passes through the bird’s body without being harmed. Hours later, the kererū might be a long way from the tree where it ate. When it drops the seed, along with a little natural fertiliser, a new tree may grow. In this way kererū help forests spread and stay healthy.",
"Long ago, other large birds may have helped to spread big seeds too, but many of them are now extinct. Today, the kererū is the only bird left in Aotearoa with a beak and throat wide enough to swallow the largest native fruits. Tūī and bellbirds help with small seeds, but they cannot manage a big taraire fruit. If kererū disappeared, some of our tallest trees would find it very hard to spread.",
"Kererū face real dangers. Rats, stoats and possums raid their nests and eat their eggs. Possums also compete with them for fruit. Kererū lay only one egg at a time, so their numbers grow back slowly.",
"The good news is that people can help. Trapping pests gives chicks a better chance. Planting native fruit trees provides food. Every year, people all over the country also count the kererū they see, to help scientists track how the birds are doing.",
"And one more fact: in late summer, kererū sometimes eat fruit that has started to ferment. The birds can become clumsy and wobbly, and now and then they even fall out of trees. It is a funny sight, but it also shows just how much this hungry bird loves its fruit."],
vocab:[["gorge","To eat a huge amount, greedily.","After the game we gorged on pizza."],
["extinct","Died out completely, with none left anywhere.","The moa became extinct hundreds of years ago."],
["ferment","When yeast or bacteria change the sugar in food, making gas or alcohol.","The fallen plums began to ferment in the hot sun."],
["fertiliser","Something added to soil to help plants grow.","Dad dug fertiliser into the vege garden."]],
qs:[
["lit","How do you usually first notice a kererū?",["The loud whoosh of its wings","A high whistle","A booming call at night","Its bright red beak"],"The first two sentences tell us you hear it first, from the “loud whoosh, whoosh” of its wings.","Its wings make a loud whoosh, whoosh as it flies between trees"],
["voc","In autumn, kererū “gorge on” fruit. What does that mean?",["They eat a lot of it, greedily","They store it for winter","They look at it carefully","They feed it to their chicks"],"Gorge means to eat a huge amount. The text keeps showing how much kererū love fruit.","In autumn they gorge on the fruit of trees such as taraire, tawa, pūriri and miro."],
["main","Why are kererū so important for forests?",["They spread the seeds of large native fruits","They eat insects that harm trees","They pollinate flowers","Their nests protect young trees"],"The seed passes through the bird unharmed and is dropped far away, so new trees can grow: “kererū help forests spread and stay healthy.”","In this way kererū help forests spread and stay healthy."],
["inf","Why can’t tūī spread taraire seeds?",["Their beaks and throats are too small for the big fruit","They don’t like the taste of taraire","They live in different forests","They are extinct"],"Only the kererū has “a beak and throat wide enough to swallow the largest native fruits”. Tūī “cannot manage a big taraire fruit”.","Tūī and bellbirds help with small seeds, but they cannot manage a big taraire fruit."],
["inf","“Kererū lay only one egg at a time, so their numbers grow back slowly.” What can you work out from this?",["Losing even a few eggs to pests is a big problem","Kererū don’t need protecting","Kererū eggs are very large","Kererū lay an egg every day"],"If each nest has only one egg, every egg eaten by a rat or possum is a whole chick lost. That is why pest trapping matters.","Kererū lay only one egg at a time, so their numbers grow back slowly."],
["str","How are paragraphs 5 and 6 organised?",["Problem, then solution","In time order","As a comparison of two birds","As a question and its answer"],"Paragraph 5 gives the dangers (the problem). Paragraph 6 starts “The good news is that people can help” and gives solutions.","The good news is that people can help."],
["pur","Why does the writer end with kererū falling out of trees?",["To end on a funny, memorable fact that links back to their love of fruit","To warn people about fermented fruit","To prove that kererū are not clever","To explain how most kererū die"],"The writer says so: “It is a funny sight, but it also shows just how much this hungry bird loves its fruit.” Endings often link back to the main idea.","It is a funny sight, but it also shows just how much this hungry bird loves its fruit."]]},

{id:"rewena",title:"Nan’s Bug",band:1,worlds:["cooking"],genre:"Narrative",subject:"",
blurb:"The jar on Nan’s bench is alive, she says. By the end of the holidays it will be your job to keep it that way.",
paras:[
"The jar on Nan’s bench was alive. That’s what she told me, anyway. It didn’t look alive. It looked like porridge that had been left out too long, pale and lumpy, with tiny bubbles popping on the top.",
"“That’s my bug,” Nan said. “It’s older than you.”",
"I had come to stay for the second week of the holidays, and on the first morning she put me to work. “Rēwena,” she said, tapping the jar. “Today you learn.”",
"The bug, Nan explained, was a potato starter. Years ago she had boiled a potato, mashed it in its cooking water, and stirred in flour and a spoonful of sugar. Then she left it somewhere warm. Tiny living things called wild yeasts, floating in the air and sitting on the flour, moved in and started to feed on the sugar. As they fed, they breathed out gas. That was what made the bubbles.",
"“You have to feed it, like a pet,” Nan said. Every few days she tipped in more potato water and flour. If she forgot, the bug went flat and sour and sulky.",
"We mixed a cupful of bug with flour, a little sugar and salt, and then Nan added a pinch of baking soda. “Takes the sour edge off,” she said. I kneaded the dough on the bench until my arms ached and the dough felt smooth and springy, like a stress ball. Then we put it in a greased tin, covered it with a tea towel and waited.",
"Waiting was the hardest part. I checked under the tea towel four times in the first hour. Nothing. “Bread doesn’t like being watched,” Nan said, without looking up from her crossword.",
"But by the afternoon, the dough had swelled right up over the edge of the tin, fat and puffy. The gas from the bug had been trapped inside, stretching the dough like a balloon. Nan slid it into the oven, and soon the whole house smelled sweet and toasty.",
"When it came out, golden on top, Nan cut the first slice and handed it to me with butter melting into it. It was a little bit sour and a little bit sweet. Then she spooned some of the bug into a clean jar, screwed on the lid and pushed it across the table to me.",
"“Your turn to keep it alive,” she said."],
vocab:[["starter","A mix of flour and water (or potato) full of living yeast, used to make bread rise.","Sourdough bakers keep a starter in the fridge and feed it."],
["yeast","Tiny living fungi that eat sugar and give off gas.","Yeast makes bread light and fluffy."],
["kneaded","Pressed, folded and stretched dough with your hands.","He kneaded the pizza dough for ten minutes."],
["sulky","In a grumpy mood and not cooperating.","My brother was sulky after he lost the game."]],
qs:[
["lit","What was Nan’s “bug”?",["A potato starter full of wild yeast","A pet insect","A loaf of bread","A jar of old porridge"],"Nan explains it directly: “The bug … was a potato starter.” It only looked like porridge.","The bug, Nan explained, was a potato starter."],
["lit","What made the bubbles in the jar?",["Gas breathed out by the yeasts as they fed","Boiling water","The baking soda","Air from stirring"],"The yeasts fed on the sugar, and “as they fed, they breathed out gas. That was what made the bubbles.”","As they fed, they breathed out gas."],
["pur","Nan’s bug could go “flat and sour and sulky”. Why does the writer use the word sulky?",["To describe the bug like a grumpy person, so we know it stops working well","To show the bug smelled strong","To show the bug got too hot","To show the bug turned sweet"],"Giving a jar of yeast a human mood is called personification. It makes the bug feel like a pet with feelings, which matches “feed it, like a pet”.","If she forgot, the bug went flat and sour and sulky."],
["voc","The dough felt “smooth and springy, like a stress ball”. What does springy mean here?",["It bounces back when you press it","It is wet and sticky","It is hard like a rock","It falls apart easily"],"A stress ball squashes and then pops back into shape. The comparison helps you feel what springy dough is like.","the dough felt smooth and springy, like a stress ball"],
["inf","“Bread doesn’t like being watched,” Nan says. What is she really telling the narrator?",["Be patient and stop checking","Bread is shy","Turn off the light","She wants to be left alone"],"The narrator checked “four times in the first hour”. Nan’s joke is a gentle way of saying rising takes time, so stop peeking.","Bread doesn’t like being watched"],
["lit","Why did the dough swell up over the tin?",["Gas from the bug was trapped inside it","The oven was very hot","The baking soda exploded","The tea towel kept it warm"],"The text explains: “The gas from the bug had been trapped inside, stretching the dough like a balloon.” This happened before it went in the oven.","The gas from the bug had been trapped inside, stretching the dough like a balloon."],
["str","How is the story mainly organised?",["In time order, following the bread from morning to after it’s baked","As a list of facts about yeast","As an argument for baking at home","Backwards, from the ending to the start"],"It follows one day: the first morning, mixing, waiting, “by the afternoon”, baking and eating. Time words guide you through.","But by the afternoon, the dough had swelled right up over the edge of the tin, fat and puffy."],
["main","Why does Nan give the narrator a jar of bug at the end?",["She is passing on the skill and the responsibility","She wants to clean her bench","The bug has gone sour","She has stopped making bread"],"“Your turn to keep it alive” shows Nan handing over something precious that she has kept for years. Learning is shared across generations.","“Your turn to keep it alive,” she said."]]},

/* ───────────── BAND 2 · Years 9–10 ───────────── */
{id:"sideb",title:"Side B",band:2,worlds:["music"],genre:"Narrative",subject:"",
blurb:"Sorting Grandad’s records in the garage, a teenager finds a set list, a star and a voice nobody remembers hearing.",
paras:[
"Grandad’s records lived in three apple boxes in the garage, under a tarpaulin that smelled of engine oil and rain. Nobody had touched them since the funeral. When Mum finally asked me to help sort the garage, I think she half hoped I’d say they could go to the op shop.",
"I didn’t say that. I sat on an upturned bucket and went through them one by one.",
"Most of the names meant nothing to me. They were bands from Ōtepoti in the eighties, with jangly guitars on the recordings and covers that looked photocopied and coloured in by hand. I knew Grandad had grown up in Dunedin and played bass in something, once, but he had never talked about it. He talked about rugby, the price of petrol, and whether I was wearing a warm enough jacket.",
"Halfway through the second box, a folded piece of paper slid out of a sleeve. It was a set list, written in blue biro: eleven songs, and beside the last one someone had drawn a small star. At the bottom it said Crown Hotel, 1984. Under that, in different handwriting, smaller: You were brilliant. Don’t stop. — J.",
"I didn’t know who J was. It wasn’t Nana; her name was Ruth.",
"The record it had been hiding in was a seven-inch single by a band called The Low Tides. Side A was a bright, poppy song about summer. I had never heard of it, and judging by the plain cover, not many other people had either. Side B was called “Harbour Cone”. It was the last song on the set list, the one with the star. And in the tiny print on the label: bass and vocals, Dave Ferris.",
"Grandad.",
"Mum’s old turntable still worked if you held the arm down for the first few seconds. I put on side B. It started with just bass: slow, low notes, walking up and down like someone pacing a hallway at night. Then a voice came in, younger than I had ever imagined his voice could be, singing about a hill, and a harbour, and leaving.",
"I played it four times. On the fourth time, Mum was standing in the doorway, holding a box of rubbish bags she had forgotten she was holding.",
"“I never heard him sing,” she said.",
"We didn’t sort the garage that day. We sat on the floor with the records spread around us, and Mum told me what she remembered, which was not much, and I told her what I had found, which was not much either. But it was more than we’d had that morning.",
"The A side, I’ve decided, is what everyone gets to hear. The B side is what you keep for yourself, until someone finds it."],
vocab:[["jangly","Making a bright, ringing, slightly messy sound, like keys shaken together.","The jangly guitar made the song sound sunny."],
["set list","The list of songs a band plans to play at a gig, in order.","The drummer taped the set list to the stage floor."],
["pacing","Walking back and forth, often because you are worried or thinking hard.","Dad was pacing the hallway, waiting for the phone call."],
["tarpaulin","A large sheet of strong waterproof material used to cover things.","They threw a tarpaulin over the firewood before the storm."]],
qs:[
["lit","Where were Grandad’s records kept?",["In three apple boxes in the garage","In Mum’s bedroom","At the op shop","In a cupboard at Nana’s house"],"The first sentence tells us: “three apple boxes in the garage, under a tarpaulin”.","Grandad’s records lived in three apple boxes in the garage"],
["inf","“I think she half hoped I’d say they could go to the op shop.” What does this suggest about Mum?",["Sorting her dad’s things is hard, and part of her wants it over with","She dislikes music","She wants to sell the records for money","She wants the narrator to keep everything"],"“Nobody had touched them since the funeral.” Clearing a parent’s things is painful, so giving them away quickly might feel easier. “Half hoped” shows she has mixed feelings.","I think she half hoped I’d say they could go to the op shop."],
["inf","Grandad talked about rugby, petrol prices and warm jackets. What does this show?",["He talked about everyday things and kept his music past to himself","He loved rugby more than music","He was unkind to the narrator","He had forgotten his past"],"The narrator knew only that he “played bass in something, once”, and that “he had never talked about it”. His everyday talk hid a private side.","He talked about rugby, the price of petrol, and whether I was wearing a warm enough jacket."],
["voc","The bands had “jangly guitars”. What does jangly describe?",["A bright, ringing, slightly messy sound","A very quiet sound","An out-of-tune sound","A deep, heavy sound"],"Jangly is an onomatopoeic word: it sounds like keys jingling. It describes bright, chiming guitars.","with jangly guitars on the recordings"],
["str","Why is “Grandad.” given its own one-word paragraph?",["To make the discovery land with force","Because the narrator forgot his name","To jump forward in time","To show Grandad speaking"],"Setting one word apart slows the reader down and creates a pause, the same jolt the narrator feels on reading the name.","Grandad."],
["pur","The bass notes walk “like someone pacing a hallway at night”. What mood does this create?",["Restless, thoughtful and a little lonely","Cheerful and bouncy","Angry and loud","Sleepy and bored"],"Pacing at night suggests worry or deep thought. The simile shapes how we hear a song about “leaving”.","walking up and down like someone pacing a hallway at night"],
["inf","“I never heard him sing,” Mum says. What does this reveal?",["Even Mum didn’t know this part of Grandad’s life","Mum didn’t like his singing","Grandad was a famous singer","Mum has trouble hearing"],"Grandad kept his music hidden even from his own daughter. The record lets both of them meet a side of him they never knew.","“I never heard him sing,” she said."],
["main","What is the meaning of the final paragraph?",["People have private sides that others may only discover later, like a B side","B sides are always better songs","The narrator plans to sell the record","A sides are boring"],"The narrator turns the record into a metaphor: the A side is the public self, the B side the private self, waiting to be found.","The B side is what you keep for yourself, until someone finds it."]]},

{id:"backseat",title:"Back Seat Sketchbook",band:2,worlds:["art"],genre:"Poem",subject:"",
blurb:"A short poem. One bus ride, one pencil, and a handful of strangers who don’t know they’re being drawn.",
paras:[
"I sit at the back, where the engine hums\nup through the seat and into my pencil,\nso every line I draw has a small shake in it,\nlike it’s nervous too.",
"A man in a hi-vis vest is asleep against the window,\nhis mouth a soft O, his boots still caked\nwith somebody else’s building site.\nI give him three quick curves and a shadow.\nHe doesn’t know he’s art.",
"Two girls in school jerseys share one pair of earbuds,\nheads tipped together like bookends.\nTheir laughter is too fast to draw,\nso I draw the space between them instead.",
"An old woman holds a bag of feijoas on her lap\nthe way you’d hold a sleeping cat.\nShe catches me looking.\nI freeze, pencil up, caught.\nShe lifts her chin a little, turns to the light,\nposing, generous,\nand for two stops past the motorway\nshe lets me get it right.",
"At my stop I close the book on all of them,\nthese strangers, folded into paper,\nriding home with me."],
vocab:[["caked","Covered with a thick, dried layer of something.","His shoes were caked in mud after cross-country."],
["bookends","A pair of heavy objects that hold up a row of books from each side.","The twins sat at each end of the couch like bookends."],
["posing","Holding still in a position so someone can draw or photograph you.","The dog sat posing for the camera."],
["generous","Kind and happy to give something to others.","It was generous of her to share her lunch."]],
qs:[
["lit","Where does the speaker sit?",["At the back of the bus","At the front behind the driver","At the bus stop","In a café window"],"The poem opens: “I sit at the back, where the engine hums”.","I sit at the back, where the engine hums"],
["inf","Every line has a shake in it, “like it’s nervous too”. What does the word too tell us?",["The speaker is nervous as well as the shaky pencil","The pencil is broken","The bus is about to crash","The speaker is cold"],"The engine makes the pencil shake, but “too” quietly admits that the speaker also feels nervous about drawing strangers.","like it’s nervous too."],
["voc","The man’s boots are “caked with somebody else’s building site”. What does caked mean?",["Covered in a thick, dried layer","Decorated","Soaked with water","Wrapped in plastic"],"Caked means coated thickly, like dried mud. “Somebody else’s” building site also hints he works hard on places he won’t live in.","his mouth a soft O, his boots still caked"],
["pur","She holds the feijoas “the way you’d hold a sleeping cat”. What does this simile show?",["She holds them gently and carefully","Feijoas are furry","She owns a cat","She is about to throw them"],"You hold a sleeping cat softly so it won’t wake. The simile shows her care, even for a bag of fruit.","the way you’d hold a sleeping cat."],
["inf","Why does the speaker “draw the space between them instead”?",["The laughter moves too fast, so the speaker captures how close the girls are","The speaker can’t draw faces","The girls asked not to be drawn","It was too dark to see them"],"“Their laughter is too fast to draw”, so the speaker finds another way to show their friendship: the closeness between their tipped heads.","so I draw the space between them instead."],
["inf","How does the old woman react when she sees she’s being drawn?",["She poses kindly so the speaker can get it right","She tells the speaker off","She gets off the bus","She hides her face"],"She “lifts her chin a little, turns to the light, / posing, generous”. She helps instead of objecting.","She lifts her chin a little, turns to the light,"],
["str","How is the poem organised?",["Each stanza focuses on a different moment or person, ending at the speaker’s stop","It is one long sentence","Time runs backwards","It is rhyming couplets about one person"],"Stanza 1 is the speaker, then the man, the girls, the old woman, and finally “At my stop”. The journey gives the poem its order.","At my stop I close the book on all of them,"],
["main","What is the poem mostly about?",["Noticing and drawing strangers on a bus, and feeling connected to them","Learning how to drive a bus","An argument between friends","The history of Auckland buses"],"The final image, “these strangers, folded into paper, / riding home with me”, shows the speaker carrying a little of each person home.","these strangers, folded into paper,"]]},

{id:"lootbox",title:"Pay to Open",band:2,worlds:["gaming"],genre:"Persuasive",subject:"Social studies",
blurb:"A glowing chest, a slow reveal, a $2.99 button. Should loot boxes be treated like gambling?",
paras:[
"You have just finished a tough match. The game flashes a glowing chest on the screen. Open it, and you might get a rare skin that every player in the lobby will envy. Or you might get a common spray that you already own three of. Want to try again? That will be $2.99.",
"This is a loot box: a virtual prize you pay for without knowing what is inside. Loot boxes appear in many popular games, including games played by children. I believe they should be treated like gambling, and kept away from young players, for three reasons.",
"First, loot boxes work in the same way as a pokie machine. You pay money, there is a moment of suspense, and then a random result. Sometimes you win big; mostly you don’t. The flashing lights, the sound effects and the slow reveal are designed to make that moment exciting, so that you want to feel it again. Game companies employ experts to make this as effective as possible. That is not an accident.",
"Second, the odds are often hidden or hard to find. Some companies now publish the chance of getting each item, but the information is usually buried in menus that few players read. If a rare item has a one-in-a-thousand chance, a player could easily spend hundreds of dollars chasing it. Many parents have discovered this only after seeing the credit card bill.",
"Third, young people are especially vulnerable. Researchers who study gambling have found links between spending on loot boxes and problem gambling, although they are still working out which causes which. What is clear is that teenagers’ brains are still developing the ability to control impulses. Putting a slot machine inside a game that teenagers love is like opening a bar inside a school.",
"Some people argue that loot boxes are harmless because you always get something, unlike a pokie, where you can lose everything. But getting a digital item you did not want is not much of a prize. Others say parents should simply set spending limits. Parental controls help, but they put all the responsibility on families and none on the companies making the profits.",
"Some countries have already acted. In 2018, Belgium decided that paid loot boxes broke its gambling laws, and several big games stopped selling them there. In Aotearoa, the Department of Internal Affairs has said that loot boxes do not meet the legal definition of gambling. It is time to change that definition. If something looks like gambling, works like gambling and is designed like gambling, it should be treated like gambling."],
vocab:[["virtual","Existing on a screen or online, not physically real.","She bought a virtual pet in the game."],
["suspense","The excited or nervous feeling of waiting to find out what happens.","The suspense before the results came out was unbearable."],
["vulnerable","More easily harmed or hurt.","Young seedlings are vulnerable to frost."],
["impulses","Sudden strong urges to do something without thinking.","He fought the impulse to check his phone again."]],
qs:[
["lit","What is a loot box?",["A virtual prize you pay for without knowing what is inside","A box of real prizes posted to you","A free reward for winning","A type of game console"],"Paragraph 2 defines it in one line, straight after the opening example.","This is a loot box: a virtual prize you pay for without knowing what is inside."],
["pur","Why does the writer begin by describing someone opening a chest?",["To drop the reader into the situation and hook them","To explain the rules of a game","To advertise a game","To tell a true story about the writer"],"Opening with “You” and a vivid moment puts the reader inside the experience before the argument begins. It is a common persuasive hook.","You have just finished a tough match."],
["str","How is the writer’s argument organised?",["Opinion, three reasons, answers to other views, then a conclusion","A story told in time order","A problem with no solution","A comparison of two games"],"Signal words show the structure: “for three reasons”, “First”, “Second”, “Third”, “Some people argue”, and a final call to change the law.","I believe they should be treated like gambling, and kept away from young players, for three reasons."],
["voc","“Young people are especially vulnerable.” What does vulnerable mean?",["More easily harmed","More skilled","More popular","More careful"],"The next sentences explain why: teenagers are still developing impulse control, so they can be harmed more easily.","Third, young people are especially vulnerable."],
["inf","What does the writer suggest with “That is not an accident”?",["Companies deliberately design loot boxes to keep players paying","Games are full of bugs","Experts often make mistakes","Players can never win"],"After saying companies hire experts to make the reveal exciting, this short sentence implies the effect is planned on purpose.","That is not an accident."],
["eva","The writer admits researchers are “still working out which causes which”. How does this affect the argument?",["It is honest, but it means the link is not proven to be caused by loot boxes","It proves loot boxes cause problem gambling","It makes the whole argument irrelevant","It shows researchers agree with game companies"],"A link (correlation) is not proof of cause. Admitting this makes the writer more trustworthy, but the evidence is weaker than it first sounds.","although they are still working out which causes which"],
["eva","“Like opening a bar inside a school.” What is the fairest comment on this comparison?",["It is vivid, but it may exaggerate the danger to persuade readers","It is completely accurate","It has nothing to do with the topic","It proves loot boxes are illegal"],"Strong comparisons are persuasive techniques. A careful reader asks whether the two things are really alike, or whether the image is doing more work than the evidence.","Putting a slot machine inside a game that teenagers love is like opening a bar inside a school."],
["main","What is the writer’s main argument?",["Loot boxes should be treated as gambling and kept from young players","Loot boxes should be cheaper","Belgium is better than New Zealand","Parents should control all spending"],"The thesis is stated in paragraph 2 and repeated at the end: treat loot boxes like gambling.","If something looks like gambling, works like gambling and is designed like gambling, it should be treated like gambling."]]},

{id:"matariki",title:"Why Matariki Rises in Midwinter",band:2,worlds:["space"],genre:"Explanation",subject:"Science · Social studies",
blurb:"A star cluster vanishes for weeks, then returns before dawn. The reason is our own journey around the Sun.",
paras:[
"For most of May, if you look at the evening sky over Aotearoa, you will not find Matariki. The small, tight cluster of stars has slipped out of sight. Then, in late June or early July, it reappears low in the north-east, just before dawn. For many iwi, this return marks the start of the Māori new year, and since 2022 it has been celebrated with a public holiday.",
"Why does a group of stars vanish and then come back? The answer has to do with the journey Earth makes around the Sun.",
"Stars do not really move across the sky from month to month in any way we could notice. What moves is us. Earth takes a year to orbit the Sun, and as it travels, the direction of our night sky changes. Imagine walking in a big circle around a campfire in a dark paddock. When you face away from the fire, you can see the trees on that side of the paddock. Half a lap later, those same trees are behind the fire, and its glare hides them.",
"In May, Matariki is in the same part of the sky as the Sun. It rises and sets with the Sun, so it is above us only during the day, lost in the Sun’s glare. Each day, Earth moves about one degree further along its orbit, and the Sun appears to shift away from Matariki. By late June, the gap is big enough for the cluster to rise in the darkness just before sunrise. This first appearance before dawn is called a heliacal rising, from the Greek word for sun.",
"The cluster itself is about 440 light-years away, so the light reaching your eyes left those stars centuries ago. Astronomers count hundreds of stars in it, but with your eyes alone you can usually see six to nine. In one widely shared tradition, nine stars are named, each linked to part of the environment, such as fresh water, salt water, food from the ground and food from the sky. The star Pōhutukawa is linked to people who have died since the last Matariki.",
"Not every iwi looks for Matariki. In some places, especially in the west, it is hard to see over the hills or sits too low, so people watch for a bright star called Puanga instead. This shows how closely traditional knowledge was matched to the land where people lived.",
"The date of the public holiday changes each year. It is set using the maramataka, the Māori lunar calendar, rather than the calendar of fixed months. So when you look for Matariki this winter, you are using the same sky, and the same orbit, that people in Aotearoa have watched for hundreds of years."],
vocab:[["cluster","A group of similar things close together.","A cluster of kids crowded round the phone."],
["glare","Very strong, dazzling light that makes things hard to see.","The glare off the water made her squint."],
["heliacal rising","The first time a star can be seen rising just before sunrise, after weeks hidden by the Sun.","Ancient Egyptians watched for the heliacal rising of the star Sirius."],
["lunar","To do with the Moon.","A lunar month is about 29 and a half days."]],
qs:[
["lit","When does Matariki reappear?",["In late June or early July, just before dawn","In May, in the evening","At midnight in summer","Every night of the year"],"Paragraph 1 says it “reappears low in the north-east, just before dawn” in late June or early July.","Then, in late June or early July, it reappears low in the north-east, just before dawn."],
["main","Why does Matariki disappear for a while?",["It is in the same part of the sky as the Sun and is lost in the glare","The stars stop shining in winter","Clouds always hide it in May","It moves to the northern hemisphere"],"This is the core explanation in paragraph 4: in May, Matariki rises and sets with the Sun, so it is only up in daylight.","In May, Matariki is in the same part of the sky as the Sun."],
["pur","Why does the writer include the campfire comparison?",["To explain a hard idea using a familiar, everyday picture","To describe how Matariki is celebrated","To warn about fires in winter","To show that stars are hot"],"An analogy links something new (Earth’s orbit hiding stars) to something you can imagine easily (walking round a fire whose glare hides the trees).","Imagine walking in a big circle around a campfire in a dark paddock."],
["voc","Matariki is “lost in the Sun’s glare”. What is glare?",["Very strong light that makes things hard to see","An angry look","A dark shadow","A reflection in water"],"Here glare means dazzling brightness. The Sun is so bright that nearby stars cannot be seen in daylight.","It rises and sets with the Sun, so it is above us only during the day, lost in the Sun’s glare."],
["inf","If you see Matariki tonight, roughly how old is the light entering your eyes?",["About 440 years old","About 440 days old","A few seconds old","Exactly one year old"],"A light-year is the distance light travels in a year. If the cluster is about 440 light-years away, its light has been travelling for about 440 years.","The cluster itself is about 440 light-years away, so the light reaching your eyes left those stars centuries ago."],
["lit","Why do some people watch for Puanga instead of Matariki?",["Matariki is hard to see from where they live","Puanga is part of Matariki","They do not mark the new year","Puanga rises in May"],"The text says that in some places Matariki “is hard to see over the hills or sits too low”.","In some places, especially in the west, it is hard to see over the hills or sits too low, so people watch for a bright star called Puanga instead."],
["eva","A friend says, “Matariki comes back each winter because the stars travel around us.” Which reply is best supported by the text?",["Not really: the stars barely move; Earth’s orbit changes which part of the sky we can see at night","Yes, the stars race around Earth each year","No, it’s because winter clouds clear","Yes, the Moon pushes them back"],"The text is clear: “Stars do not really move across the sky from month to month in any way we could notice. What moves is us.”","What moves is us."],
["str","How is the text organised?",["It starts with something people notice, asks why, then explains the science and cultural meaning","It is a story about one family","It argues for a new holiday date","It lists star names in alphabetical order"],"Paragraph 1 describes what you see, paragraph 2 asks the question, and the following paragraphs answer it before linking back to culture and calendar.","Why does a group of stars vanish and then come back?"]]},

/* ───────────── BAND 3 · Year 11 ───────────── */
{id:"swing",title:"Why a Cricket Ball Swings",band:3,worlds:["sport"],genre:"Explanation",subject:"Science (physics)",
blurb:"A ball leaves the hand dead straight, then bends past the bat. The secret is a layer of air thinner than a page.",
paras:[
"Watch a good fast bowler on a grey morning at the Basin Reserve and you may see something that seems to break the rules of physics. The ball leaves the hand heading straight for the stumps, then, in the last few metres, it curves sideways through the air, past the edge of the bat and into the wicketkeeper’s gloves. This is swing, and for more than a century it has puzzled batters, delighted bowlers and kept scientists busy.",
"To understand swing, you first need to know about the thin layer of air that clings to the surface of a moving ball, called the boundary layer. When the boundary layer is smooth, or laminar, it peels away from the ball’s surface relatively early. When it is turbulent, full of tiny swirls, it carries more energy and hugs the surface for longer before it separates.",
"A cricket ball has a raised seam of stitching around its middle. A swing bowler grips the ball so that the seam is tilted at a slight angle, pointing towards where they want the ball to go. On the side the seam faces, the stitching trips the boundary layer and makes it turbulent, so the air stays attached for longer. On the other side, the air stays laminar and breaks away sooner. The result is an uneven flow: the air leaving the back of the ball is pushed towards one side, and, by Newton’s third law, the ball is pushed the opposite way. The ball moves sideways, in the direction the seam is pointing.",
"This is why bowlers spend so much time polishing one side of the ball on their trousers. Keeping one side smooth and shiny helps keep the air laminar on that side, which exaggerates the difference between the two sides. The rougher side, meanwhile, helps the air become turbulent. In conventional swing, the ball curves towards the rough side.",
"Things become stranger when the ball is old and scuffed, or when it is bowled extremely fast. Then the boundary layer can become turbulent on the shiny side too, before it even reaches the seam. Now the seam’s effect is reversed, and the ball swings the other way, towards the shiny side. This is known as reverse swing, and because batters read the shine to predict movement, it can be extremely hard to play.",
"What about the weather? Many players swear that the ball swings more on cloudy, humid days. Scientists have struggled to confirm this. Some experiments have found that humidity makes little difference to the air flow itself; others suggest that cloudy conditions may simply come with calmer air, which allows smoother flow. For now, the cricketers’ belief is more widely held than the evidence for it.",
"Swing is a reminder that sport is full of physics hiding in plain sight. Every bowler polishing a ball on their whites is, in a small way, running an experiment in fluid dynamics."],
vocab:[["turbulent","Moving in a wild, swirling, uneven way.","The plane shook as it flew through turbulent air."],
["laminar","Flowing smoothly in neat, even layers.","At low pressure the tap water ran out in a clear, laminar stream."],
["exaggerates","Makes something bigger or stronger than it would be.","The camera angle exaggerates how steep the hill is."],
["humid","Warm and damp, with a lot of water vapour in the air.","Auckland summers are so humid that washing takes ages to dry."]],
qs:[
["lit","What is the boundary layer?",["A thin layer of air clinging to the surface of a moving ball","The line marking the edge of the pitch","The raised seam of stitching","The polish on the ball"],"Paragraph 2 defines it before using it: “the thin layer of air that clings to the surface of a moving ball”.","To understand swing, you first need to know about the thin layer of air that clings to the surface of a moving ball, called the boundary layer."],
["voc","In paragraph 2, what does turbulent mean?",["Full of tiny swirls, uneven","Smooth and orderly","Very hot","Slow-moving"],"The writer defines it straight after the word: “turbulent, full of tiny swirls”. Writers often explain technical words with an appositive like this.","When it is turbulent, full of tiny swirls, it carries more energy and hugs the surface for longer before it separates."],
["lit","In conventional swing, which way does the ball move?",["In the direction the seam points, towards the rough side","Towards the shiny side","Straight down into the pitch","Upwards, towards the batter’s head"],"Paragraph 3 ends: “The ball moves sideways, in the direction the seam is pointing,” and paragraph 4 adds that it curves “towards the rough side”.","The ball moves sideways, in the direction the seam is pointing."],
["inf","Why does polishing one side of the ball help a bowler?",["It keeps the air laminar on that side, increasing the difference between the sides","It makes the ball heavier","It makes the ball travel faster","It is only a tradition with no effect"],"Swing depends on the two sides behaving differently. A smooth side stays laminar while the rough side goes turbulent, so the polish “exaggerates the difference”.","Keeping one side smooth and shiny helps keep the air laminar on that side, which exaggerates the difference between the two sides."],
["inf","Why is reverse swing especially hard for batters?",["The ball moves the opposite way to what the shine suggests","It is always faster than normal swing","It bounces twice","It is against the rules"],"Batters “read the shine to predict movement”. In reverse swing, the ball moves towards the shiny side, so their prediction is wrong.","This is known as reverse swing, and because batters read the shine to predict movement, it can be extremely hard to play."],
["eva","How should the claim “the ball always swings more on humid days” be judged, based on paragraph 6?",["Widely believed, but not well supported by evidence","Proven by scientists","Proven completely false","Not relevant to swing"],"The writer weighs belief against evidence: “the cricketers’ belief is more widely held than the evidence for it.” That is not the same as proving it false.","For now, the cricketers’ belief is more widely held than the evidence for it."],
["str","How does the text build its explanation?",["It introduces the key idea (the boundary layer) first, then applies it to the seam, polishing and reverse swing","It tells the events of one match in order","It lists players’ opinions","It begins with the conclusion and works backwards"],"“You first need to know” signals a foundation idea. Each later paragraph uses it to explain something new.","To understand swing, you first need to know about the thin layer of air"],
["pur","Why does the writer end by calling a bowler’s polishing “an experiment in fluid dynamics”?",["To show that science is part of everyday sport","To criticise cricketers for wasting time","To claim that bowlers are trained scientists","To explain the rules of cricket"],"The ending widens the topic: physics is “hiding in plain sight” in sport. Calling a habit an experiment makes the reader see it differently.","Swing is a reminder that sport is full of physics hiding in plain sight."]]},

{id:"shed",title:"Measure Twice",band:3,worlds:["building"],genre:"Narrative",subject:"",
blurb:"After the cyclone, Uncle Rua’s shed needs a new roof. Saturday by Saturday, a Year 11 student learns what the offcut pile is for.",
paras:[
"The shed had come through the cyclone better than the house. That was the joke Uncle Rua kept making, anyway, standing in what used to be the back paddock with his hands on his hips and silt up to his ankles. The house had been gutted to the studs; the shed had only lost its roof and one wall. “Built it myself,” he said. “Should’ve built the house too.”",
"Nobody laughed the first time, back in February. By October, it had become the sort of joke you laughed at because not laughing took more effort.",
"I was supposed to be studying for my exams. Instead, every Saturday, I was in Tairāwhiti holding the other end of a tape measure.",
"Uncle Rua had rules. The first was the oldest one in building: measure twice, cut once. The second was that you never trusted a measurement you hadn’t taken yourself, even if it was his. The third, which he only told me after I had cut a rafter forty millimetres short and stood staring at it as if it had betrayed me, was that the mistakes were part of the plan.",
"“Every builder’s got a pile of offcuts,” he said, tossing my rafter onto his. “Pile tells you how they learnt.”",
"Building a roof, it turns out, is mostly maths. The rafters had to sit at the same pitch as the old ones so the new iron would line up with the sheets we had salvaged. Uncle Rua didn’t work it out on paper. He held a framing square against the wall plate, squinted, and announced numbers that turned out, when I checked them on my phone, to be almost exactly right. When I asked how he knew, he shrugged. “Forty years of getting it wrong.”",
"We worked mostly without talking. That suited me. At home, everyone talked about the cyclone constantly: insurance, the council, who was moving away. Here there was just the creak of timber, the gun-crack of the nail gun and the slow, stubborn work of putting one thing on top of another until it held.",
"On the last Saturday before my exams, we lifted the final sheet of roofing iron into place. It was secondhand, dented in one corner, and a slightly different shade of grey from the rest. Uncle Rua screwed it down and then stood in the doorway, looking up, as rain started to tick against the new roof. Not a drop came through.",
"“She’ll do,” he said, which from Uncle Rua was a speech.",
"Then he did something I didn’t expect. He went to the offcut pile, picked up my short rafter, and wrote on it in carpenter’s pencil: First cut. October. He propped it above the door, on the ledge where some people keep a horseshoe.",
"I passed my maths exam that year. I’d like to say it was the trigonometry of roof pitches, but I think it was something else: knowing that you could get a thing wrong, measure again, and still build something that kept the rain out."],
vocab:[["gutted","With the inside parts stripped out, leaving only the frame.","After the flood, the kitchen was gutted and rebuilt."],
["salvaged","Saved from something damaged or destroyed, so it can be used again.","They salvaged bricks from the old school to build a wall."],
["pitch","The angle or steepness of a roof.","A steeper pitch helps snow slide off."],
["betrayed","Let down by someone or something you trusted.","She felt betrayed when her friend shared her secret."]],
qs:[
["lit","What had happened to the house in the cyclone?",["It had been gutted to the studs","It had only lost its roof","It had blown away completely","It was undamaged"],"The narrator contrasts the two buildings: the house was “gutted to the studs”, while the shed “only lost its roof and one wall”.","The house had been gutted to the studs; the shed had only lost its roof and one wall."],
["voc","The rafters had to sit “at the same pitch as the old ones”. What does pitch mean here?",["The angle of the roof","A sports field","A sales talk","How high a sound is"],"Pitch has several meanings. In a sentence about rafters lining up with roofing iron, it means the slope or angle of the roof.","The rafters had to sit at the same pitch as the old ones so the new iron would line up with the sheets we had salvaged."],
["inf","What does Uncle Rua mean by “Pile tells you how they learnt”?",["Mistakes are evidence of learning, not something to be ashamed of","Builders should never throw anything away","Offcuts are valuable to sell","He is annoyed about wasted wood"],"He says this while tossing the narrator’s mistake onto his own pile. Every offcut is a mistake that taught something, and his pile is bigger.","“Every builder’s got a pile of offcuts,” he said, tossing my rafter onto his."],
["str","Paragraph 7 sets the quiet shed against the talk at home. What does this contrast show?",["The practical work gives the narrator a calm break from cyclone stress","The nail gun is dangerous","Building is noisy and annoying","The family has stopped speaking to each other"],"At home it is “insurance, the council, who was moving away”. In the shed there are only work sounds and steady progress. The contrast shows why the narrator values Saturdays.","At home, everyone talked about the cyclone constantly: insurance, the council, who was moving away."],
["inf","“She’ll do,” he said, which from Uncle Rua was a speech. What does this tell us?",["Uncle Rua rarely says much, so this is high praise","He is disappointed with the roof","He talks a lot","He is talking about a woman"],"Calling two words “a speech” is humorous understatement. For a man of few words, “She’ll do” means he is proud of the roof.","“She’ll do,” he said, which from Uncle Rua was a speech."],
["pur","The rafter goes “on the ledge where some people keep a horseshoe”. What does this comparison suggest?",["The mistake has become a kind of good-luck charm and reminder","It is made of metal","It will keep horses out","It will be thrown away later"],"Horseshoes over doors are traditional good-luck symbols. Placing the first mistake there turns it into something to honour.","He propped it above the door, on the ledge where some people keep a horseshoe."],
["eva","The narrator checks Uncle Rua’s numbers on a phone. How does the story treat experience and calculation?",["It respects both: his experience is almost exactly right, and checking follows his own second rule","It shows phones are useless","It shows experience is always wrong","It shows the narrator doesn’t trust maths"],"His numbers were “almost exactly right”, and his second rule says never trust a measurement you didn’t take yourself. Experience and checking work together.","announced numbers that turned out, when I checked them on my phone, to be almost exactly right"],
["main","What is the main idea the narrator takes from the experience?",["You can get things wrong, measure again, and still build something that works","Maths only matters in exams","Cyclones are not really dangerous","You should always trust other people’s measurements"],"The final sentence states the lesson directly, and it links the roof to life after the cyclone.","knowing that you could get a thing wrong, measure again, and still build something that kept the rain out."]]},

{id:"kelp",title:"Bring Back the Kelp",band:3,worlds:["sea","animals"],genre:"Persuasive",subject:"Science · Social studies",
blurb:"Some reefs off the north-east coast look like underwater deserts. We already know how to turn them back into forests.",
paras:[
"Put on a mask and snorkel at some reefs in north-eastern Aotearoa and you might think you are swimming over a desert. The rocks are bare and pale, grazed clean. Hundreds of spiny kina cling to them, and almost nothing else grows. Scientists call these places kina barrens. Decades ago, many of them were forests of kelp, swaying, golden-brown and full of life.",
"How does a forest turn into a desert? The answer is a food chain that has been knocked out of balance. Kina eat kelp. Snapper and crayfish, tāmure and kōura, eat kina. When people catch too many large snapper and crayfish, there is little to keep kina numbers in check. The kina multiply and graze the kelp faster than it can regrow, until it is gone. Without the kelp, the fish, shellfish and other animals that sheltered and fed among it disappear too.",
"We know this is what happens because we have seen it reversed. In 1975, New Zealand’s first marine reserve was created at Cape Rodney–Okakari Point, near Leigh, north of Auckland. Fishing was banned. Over the following years, scientists recorded large snapper and crayfish in far greater numbers inside the reserve than outside it. They ate more kina. Gradually, the kelp grew back, and areas that had been barrens became forests again.",
"This is a powerful lesson, and we should act on it. Marine reserves cover only a small fraction of our coastal waters. Far more of our coast should be protected, especially in places like the Hauraki Gulf, Tīkapa Moana, where barrens have spread.",
"Protection does not have to mean locking everyone out forever. Some iwi and hapū have placed rāhui on stretches of coast: temporary bans on taking seafood so that it can recover. These local, community-led approaches can work alongside reserves. Divers in some areas have also tried removing kina by hand to give kelp a head start, although this only works if the predators come back too.",
"Some people who fish worry that more reserves will mean fewer places to fish. That is a fair concern. But evidence from reserves around the world suggests that protected areas can act like nurseries: big, healthy fish breed inside them, and their young spread into the surrounding sea. Fishing near a reserve’s boundary is often better, not worse.",
"Kelp forests matter beyond the fish. They soften the waves that reach our shores, and they store carbon. And unlike many environmental problems, this one has a solution we have already tested in our own waters. We know how to bring back the kelp. The question is whether we are willing to let it grow."],
vocab:[["grazed","Eaten bit by bit, the way cows eat grass.","The sheep had grazed the paddock down to dirt."],
["multiply","Increase greatly in number.","Rabbits multiply quickly when nothing hunts them."],
["rāhui","A temporary ban, often placed by iwi or hapū, on taking resources from an area so it can recover.","A rāhui on gathering shellfish gave the beds time to recover."],
["nurseries","Places where young animals or plants are raised and protected.","Estuaries are nurseries for many young fish."]],
qs:[
["lit","What are kina barrens?",["Reefs grazed bare by too many kina","Sandy beaches with no shells","Deep trenches far out at sea","Farms where kina are grown"],"Paragraph 1 describes bare rock covered in kina, then names it: “Scientists call these places kina barrens.”","Scientists call these places kina barrens."],
["str","How does paragraph 2 explain the problem?",["As a chain of causes and effects through the food chain","As a list of unrelated facts","As a story about one diver","By comparing two countries"],"Each step causes the next: fewer predators, more kina, less kelp, fewer animals. This cause-and-effect chain answers the question that opens the paragraph.","The answer is a food chain that has been knocked out of balance."],
["voc","“There is little to keep kina numbers in check.” What does in check mean?",["Under control","Counted","Increasing","Fed"],"To keep something in check is to stop it growing out of control. Predators normally control kina numbers.","When people catch too many large snapper and crayfish, there is little to keep kina numbers in check."],
["lit","What evidence does the writer give that the problem can be reversed?",["After fishing was banned at Leigh, predators returned and the kelp grew back","Divers removed every kina from the Hauraki Gulf","Kelp grows back anywhere in a year","Scientists replanted kelp by hand"],"The Leigh marine reserve is the key example: a real, local case where protection led to kelp forests returning.","Gradually, the kelp grew back, and areas that had been barrens became forests again."],
["inf","Why does removing kina by hand “only work if the predators come back too”?",["Without predators, kina numbers would rebuild and graze the kelp again","Divers get too tired","Kina are a protected species","Predators eat kelp"],"Removing kina treats the symptom. If snapper and crayfish are still missing, nothing stops the kina from multiplying again.","Divers in some areas have also tried removing kina by hand to give kelp a head start, although this only works if the predators come back too."],
["pur","Why does the writer include the paragraph about people who fish?",["To acknowledge an opposing view and answer it with evidence","To attack people who fish","To change the subject","To give fishing tips"],"“That is a fair concern” concedes the point, then “But evidence…” rebuts it. Answering the other side makes an argument more convincing.","That is a fair concern."],
["eva","Which statement best evaluates the strength of the argument?",["It is strong because it uses a real local example where protection worked, though it gives few numbers","It is weak because it has no evidence at all","It is strong because it relies only on emotion","It is weak because it agrees with people who fish"],"The Leigh example is solid evidence close to home. A critical reader might still want figures: how much kelp, how fast, how much coast is protected.","We know this is what happens because we have seen it reversed."],
["main","The writer’s main purpose is to persuade readers that…",["More of our coast should be protected so kelp forests can recover","People should eat more kina","Fishing should be banned everywhere forever","Kelp is not important"],"The call to action is in paragraph 4. The writer also rules out a total ban: “Protection does not have to mean locking everyone out forever.”","Far more of our coast should be protected, especially in places like the Hauraki Gulf, Tīkapa Moana, where barrens have spread."]]},

{id:"pixels",title:"Why Old Games Look Like That",band:3,worlds:["gaming","art"],genre:"Explanation",subject:"Digital technologies · Art",
blurb:"Blocky heroes, three-colour sprites, flat skies. The retro look wasn’t a lack of skill. It was a set of rules.",
paras:[
"Look at a screenshot of a video game from the mid-1980s and the first thing you notice is the blocks. Characters are made of chunky squares, skies are a single flat colour, and a hero might be wearing exactly three colours, no more. It is tempting to think the artists simply could not draw. In fact, the look of early games is the result of clever people working within very strict limits, and those limits shaped a whole art style that designers still choose today.",
"The first limit was resolution. A popular home console of the time drew its picture at 256 pixels across and 240 down. A modern phone screen can have more than forty times as many pixels in total. With so few dots to work with, an artist designing a character might have a grid of just 16 by 16 squares. Every single pixel mattered. One square could be the difference between a face looking happy or surprised.",
"The second limit was colour. That console could produce a palette of only about fifty usable colours, and each small moving character, or sprite, could use just three of them plus a see-through background. Artists learnt to make those three colours work hard. A dark outline, a main colour and a highlight could suggest a rounded, solid shape. Where they needed an in-between shade, they used dithering: a checkerboard of two colours that the eye blends together from a distance, rather like the dots in a printed newspaper photo.",
"The third limit was the hardware’s memory and speed. The machine could only show a small number of sprites on the same horizontal line of the screen. If too many enemies lined up, some would flicker or vanish. Designers planned levels to avoid this, and some famous characters were designed to be small partly because of it.",
"There was also a limit that today’s players rarely think about: the television itself. Old cathode-ray tube televisions did not show crisp, square pixels. They blurred and softened the image, and the light glowed slightly between rows. Artists drew knowing this, so details that look harsh on a sharp modern screen once melted into smooth curves and gentle shading. Some modern emulators even add fake scan lines to recreate the effect.",
"Today there are no such limits. Yet many independent game makers deliberately choose pixel art. Partly this is nostalgia. But it is also a design decision. A strict palette and a small grid force clarity: every element must be readable at a glance. Constraints, it turns out, can be a creative tool rather than just an obstacle.",
"So the next time you see a blocky retro hero, look more closely. Each square was a decision."],
vocab:[["resolution","The number of pixels (tiny dots) that make up an image. More pixels means more detail.","The photo looked blurry because its resolution was low."],
["palette","The set of colours an artist can choose from.","Her palette for the poster was mostly blues and greens."],
["dithering","Mixing dots of two colours in a pattern so they look like a third colour from a distance.","The artist used dithering to fake an orange sunset with red and yellow dots."],
["constraints","Limits or rules that restrict what you can do.","The tiny budget was a big constraint on the school ball."]],
qs:[
["lit","What resolution did the console draw its picture at?",["256 pixels across and 240 down","16 by 16 pixels","About fifty pixels","More than forty times a phone’s"],"Paragraph 2 gives the exact figures. The 16 by 16 grid was the size of one character, not the whole screen.","A popular home console of the time drew its picture at 256 pixels across and 240 down."],
["main","What is the main idea of the text?",["The early game look came from clever work within strict limits, and the style is still chosen today","Early game artists couldn’t really draw","Old games are better than new ones","Modern phones have better screens"],"Paragraph 1 states the thesis after rejecting a common belief (“It is tempting to think…”). The rest of the text supports it limit by limit.","In fact, the look of early games is the result of clever people working within very strict limits"],
["voc","What is dithering?",["A checkerboard of two colours that the eye blends into an in-between shade","Shaking the controller","Drawing a dark outline","Making sprites flicker"],"The writer defines it after the colon: “a checkerboard of two colours that the eye blends together from a distance”.","Where they needed an in-between shade, they used dithering: a checkerboard of two colours that the eye blends together from a distance"],
["inf","Why might a designer avoid lining up lots of enemies across the screen?",["Some could flicker or vanish because of the sprite limit","It would look boring","The television could break","Their colours would mix"],"The hardware could only show a few sprites on the same horizontal line, so a row of enemies could make some disappear.","If too many enemies lined up, some would flicker or vanish."],
["inf","Why can an old game look harsher today than it did in the 1980s?",["Modern screens show crisp pixels without the old TV’s softening blur","Modern screens have fewer colours","The games have been changed","Modern screens are smaller"],"Artists drew for blurry CRT televisions. On a sharp screen, the softening that smoothed their pixels is gone.","Artists drew knowing this, so details that look harsh on a sharp modern screen once melted into smooth curves and gentle shading."],
["str","How are paragraphs 2 to 5 organised?",["Each explains one limit and how artists responded to it","In time order of making one game","As a problem and an argument","As a comparison of two consoles"],"Signal phrases mark each section: “The first limit”, “The second limit”, “The third limit”, “There was also a limit”.","The second limit was colour."],
["pur","Why does the writer compare dithering to “the dots in a printed newspaper photo”?",["To link the idea to something readers may have seen","To show newspapers used video games","To argue newspapers are old-fashioned","To describe the colour of newsprint"],"Comparing a new idea to a familiar one helps the reader picture it. Newspaper photos also use dots that blend from a distance.","rather like the dots in a printed newspaper photo"],
["eva","The writer says constraints “can be a creative tool rather than just an obstacle.” Which detail best supports this?",["Artists used just three colours to suggest rounded, solid shapes","The console drew 256 pixels across","Emulators add fake scan lines","Enemies sometimes vanished"],"Making a solid, rounded shape from only three colours shows a limit leading to a clever solution. The other details describe limits or effects, not creativity.","A dark outline, a main colour and a highlight could suggest a rounded, solid shape."]]},

/* ───────────── BAND 4 · Years 12–13 ───────────── */
{id:"dark",title:"Who Owns the Dark?",band:4,worlds:["space"],genre:"Persuasive",subject:"Science · Social studies",
blurb:"Most of us have never seen the Milky Way properly. Light pollution is quietly taking the night sky from everyone.",
paras:[
"On a clear night above Takapō, in the Mackenzie Basin, the Milky Way is not a faint smudge but a river: dense, textured, bright enough to make the darkness around it seem deeper. Visitors who have lived their whole lives under city skies sometimes stand in the car park in silence, or swear softly, or cry. It is a strange thing to be moved to tears by something that has been above your head every night of your life, and which you have simply never seen.",
"That experience is becoming rarer. A widely cited 2016 atlas of artificial sky brightness estimated that more than a third of humanity can no longer see the Milky Way from where they live. A long-running citizen-science project, in which volunteers around the world record the faintest stars they can see, has suggested that the night sky is brightening by close to ten per cent a year, far faster than satellite measurements alone had indicated. Light pollution is, in a quiet way, one of the fastest-growing environmental changes on the planet.",
"Its costs are not only aesthetic. Artificial light at night disorients migrating birds; young petrels and shearwaters, which navigate by the moon and stars, are drawn to lit coastal towns and fall exhausted to the ground. Insects circle streetlights until they die, with consequences that ripple up food webs. In people, bright light at night can disrupt sleep and the body’s daily rhythms. And the energy spent lighting the underside of clouds is, quite literally, wasted.",
"Aotearoa is unusually well placed to respond. The Aoraki Mackenzie International Dark Sky Reserve, recognised in 2012, was for some years among the largest in the world, and Aotea Great Barrier Island became one of the first island Dark Sky Sanctuaries in 2017. These designations were not accidents of remoteness. They required communities to adopt lighting rules: shielded fittings that point light down rather than up, warmer colours, and lights that switch off when they are not needed.",
"Critics raise reasonable objections. Lighting makes streets feel safer, and some people, particularly those walking alone at night, are understandably wary of anything that sounds like turning the lights down. Businesses want their signs to be seen. But the choice is rarely between light and darkness. Much light pollution comes from poorly designed fittings that spill light sideways and upwards, where nobody needs it. Well-aimed lighting can make the ground brighter and the sky darker at the same time. The evidence that brighter lighting reduces crime is, moreover, more mixed than intuition suggests.",
"Underneath the technical debate lies a question of ownership. The night sky has been a shared inheritance for every human culture. Polynesian navigators read it to cross the Pacific; Māori used the rising of particular stars to structure the year. No one voted to give it away. Yet each poorly shielded light takes a little of it from everyone, without asking.",
"We regulate noise because sound does not respect property boundaries. Light does not either. Treating darkness as a resource worth protecting, through better design standards, council rules and simple personal choices about the lights we leave on, would cost relatively little. Losing it entirely would cost something we may not realise we valued until it is gone."],
vocab:[["aesthetic","To do with beauty or how something looks.","The architect cared about the building’s aesthetic as much as its strength."],
["disorients","Makes someone or something lose their sense of direction.","Thick fog disoriented the trampers on the ridge."],
["designations","Official titles or labels given to something.","The forest’s designation as a national park protects it from logging."],
["inheritance","Something passed down from earlier generations.","The family’s real inheritance was its stories."]],
qs:[
["lit","According to the 2016 atlas, who can no longer see the Milky Way from home?",["More than a third of humanity","About ten per cent of people","Everyone living in a city","Half of all New Zealanders"],"The figure is “more than a third of humanity”. The ten per cent figure is a different statistic: the yearly rate of brightening.","estimated that more than a third of humanity can no longer see the Milky Way from where they live"],
["voc","“Its costs are not only aesthetic.” What does aesthetic mean here?",["To do with beauty or how things look","To do with money","To do with science","To do with health"],"The opening paragraphs focus on the beauty of the sky. “Not only aesthetic” signals the writer is moving on to other costs: wildlife, health and energy.","Its costs are not only aesthetic."],
["pur","Why does the writer open with visitors crying at Takapō?",["To create an emotional connection before presenting evidence","To show that tourism is a problem","To criticise city people","To describe the weather in the Mackenzie Basin"],"Persuasive writers often start with an anecdote that makes readers feel something, then follow it with data. Paragraph 2 switches to statistics.","Visitors who have lived their whole lives under city skies sometimes stand in the car park in silence, or swear softly, or cry."],
["str","How does paragraph 3 develop the argument?",["It widens the harms beyond beauty: wildlife, insects, human health and energy","It tells a single story","It gives the other side of the argument","It describes reserves in Aotearoa"],"Starting from “not only aesthetic”, the paragraph moves through a list of different harms, building a cumulative case.","Artificial light at night disorients migrating birds"],
["inf","What does the writer suggest by “These designations were not accidents of remoteness”?",["Communities actively earned them by changing how they light things","These places were remote, so it was easy","They happened by luck","The government forced them on people"],"The next sentence explains: they “required communities to adopt lighting rules”. Dark skies were protected by choices, not just distance from cities.","These designations were not accidents of remoteness."],
["eva","How does the writer handle the objection that lighting keeps people safe?",["Accepts it as reasonable, then argues well-aimed lighting can light the ground without the sky, and notes the crime evidence is mixed","Ignores it completely","Agrees and drops the argument","Mocks people who feel unsafe"],"This is a concession and rebuttal. The writer respects the concern (“understandably wary”) but offers a solution and questions the evidence.","Well-aimed lighting can make the ground brighter and the sky darker at the same time."],
["inf","“No one voted to give it away.” What point is the writer making?",["The night sky is shared, and it is being lost without anyone agreeing to it","There should be an election about lights","Polynesian navigators held a vote","Light is free to use"],"The writer frames darkness as shared property. Each badly aimed light takes a little of it “without asking”.","Yet each poorly shielded light takes a little of it from everyone, without asking."],
["main","What is the writer’s central claim?",["Darkness is a shared resource worth protecting through better lighting choices","All outdoor lights should be switched off","Cities are bad places to live","Aotearoa has the best night skies in the world"],"The final paragraph states it: treat darkness “as a resource worth protecting”, at relatively little cost.","Treating darkness as a resource worth protecting"]]},

{id:"kakapo",title:"A Parrot That Will Not Be Hurried",band:4,worlds:["animals"],genre:"Explanation",subject:"Science (biology)",
blurb:"Flightless, nocturnal, and down to 51 birds in 1995. The kākāpō recovery is a story about genes, rimu and patience.",
paras:[
"By almost any measure, the kākāpō should not exist. It is a parrot that cannot fly, that is active at night, that weighs as much as a small cat, and that freezes when threatened, a strategy that worked well against eagles hunting by sight and catastrophically against stoats and cats hunting by smell. When those mammals arrived in Aotearoa, kākāpō numbers collapsed. By 1995 the entire known population was down to 51 birds.",
"Since then, the kākāpō has become one of the most intensively managed species on Earth. Every surviving bird has a name, wears a radio transmitter, and lives on one of a small number of predator-free islands, such as Whenua Hou off the coast of Rakiura. Rangers weigh the birds, monitor their nests through the night, and in some seasons hand-raise chicks that would otherwise struggle. The population has risen to more than two hundred. It is a genuine success, and it has been achieved through extraordinary effort.",
"Yet the kākāpō’s recovery is shaped by its biology as much as by human effort, and its biology is in no hurry. Kākāpō breed only in years when certain trees, especially rimu, produce a heavy crop of fruit, a phenomenon called masting that typically happens every two to four years. In between, the birds may not breed at all. Females usually lay only a few eggs, and a large proportion of those eggs do not hatch.",
"That last problem points to a deeper one. Because the population passed through such a narrow bottleneck, much of its genetic diversity has been lost. Nearly every kākāpō alive today descends from birds found on Rakiura, and many are closely related. Low genetic diversity is associated with poor fertility and can leave a population vulnerable to disease. In 2019, an outbreak of a fungal respiratory infection called aspergillosis killed several birds, including chicks, in a single season: a reminder of how quickly a small population can be set back.",
"Scientists have responded with tools that would have seemed like science fiction a generation ago. The genome of almost every living kākāpō has been sequenced, allowing managers to choose pairings that preserve as much diversity as possible. Artificial insemination has been used to pair birds that would not otherwise meet. Drones have even been trialled to carry fresh samples quickly between islands.",
"Not everyone is convinced this is the best use of limited conservation funding. Critics point out that the money spent on a single species could protect larger areas of habitat that benefit many species at once. Supporters reply that the kākāpō is a flagship: its fame draws public attention and funding that might not otherwise exist, and the techniques developed for it can be applied to other threatened species. Both arguments contain truth, and the debate reflects a real dilemma rather than a simple error by either side.",
"Perhaps the most important lesson of the kākāpō is about time. Conservation is often framed as an emergency, and for this bird it was. But recovery has had to move at the pace of rimu fruiting and slow-maturing birds that can live for decades. The kākāpō cannot be hurried. Its survival depends on people being willing to stay patient for longer than a single funding cycle, an election, or even a career."],
vocab:[["catastrophically","In a way that causes sudden, terrible damage.","The old bridge failed catastrophically in the flood."],
["bottleneck","In biology, a time when a population shrinks to very few individuals and much of its variety is lost. More generally, a narrow point that slows everything down.","The single checkout was a bottleneck at lunchtime."],
["flagship","The best-known example, which leads and represents a wider group or cause.","The museum’s flagship exhibition drew huge crowds."],
["dilemma","A situation where you must choose between options that each have good and bad sides.","She faced a dilemma: the party or the final training."]],
qs:[
["lit","How many kākāpō were known to exist in 1995?",["51","More than two hundred","About 2019","Four"],"Paragraph 1 ends with the figure: “By 1995 the entire known population was down to 51 birds.”","By 1995 the entire known population was down to 51 birds."],
["inf","Why did freezing protect kākāpō from eagles but not from stoats and cats?",["Eagles hunt by sight, so a still bird is hard to spot; stoats and cats hunt by smell","Eagles are slower than stoats","Stoats can climb faster than they can run","Cats only hunt by day"],"The text contrasts eagles “hunting by sight” with mammals “hunting by smell”. Keeping still hides you from eyes, not noses.","a strategy that worked well against eagles hunting by sight and catastrophically against stoats and cats hunting by smell"],
["voc","The population “passed through such a narrow bottleneck”. What does bottleneck mean here?",["A time when numbers shrank so low that much genetic variety was lost","A type of glass bottle","A traffic jam","A narrow island"],"The metaphor pictures a population squeezing through the narrow neck of a bottle. Only a few individuals’ genes make it through.","Because the population passed through such a narrow bottleneck, much of its genetic diversity has been lost."],
["lit","What is masting?",["Trees such as rimu producing a heavy fruit crop every few years","A disease that affects parrots","A way of tracking birds by radio","Breeding birds by artificial means"],"Paragraph 3 defines masting as heavy fruiting by trees like rimu, which “typically happens every two to four years”.","a phenomenon called masting that typically happens every two to four years"],
["inf","What might explain why so many kākāpō eggs do not hatch?",["Low genetic diversity, which is linked to poor fertility","The eggs are kept too cold by rangers","Rimu fruit is poisonous to eggs","Drones disturb the nests"],"The writer connects the two paragraphs: “That last problem points to a deeper one,” then links low genetic diversity with poor fertility.","Low genetic diversity is associated with poor fertility and can leave a population vulnerable to disease."],
["str","What does the word Yet at the start of paragraph 3 do?",["It turns from the success story to the limits on recovery","It adds another example of success","It introduces the conclusion","It introduces a quotation"],"“Yet” is a contrast signal. Paragraph 2 ends on success; paragraph 3 explains what is still holding the species back.","Yet the kākāpō’s recovery is shaped by its biology as much as by human effort, and its biology is in no hurry."],
["eva","How does the writer present the funding debate?",["Fairly: both sides’ reasons are given, and both are said to contain truth","One-sidedly in favour of the critics","One-sidedly in favour of the supporters","It is not discussed"],"The writer sets out the critics’ case and the supporters’ reply, then concludes it is “a real dilemma rather than a simple error by either side”.","Both arguments contain truth, and the debate reflects a real dilemma rather than a simple error by either side."],
["main","What is the main lesson the writer draws?",["Recovery depends on long-term patience that matches the bird’s slow biology","Technology alone will save the kākāpō","Funding for kākāpō should stop","Kākāpō should be moved back to the mainland"],"The final paragraph sums up: the bird “cannot be hurried”, so people must stay patient beyond funding cycles, elections and careers.","Its survival depends on people being willing to stay patient for longer than a single funding cycle, an election, or even a career."]]},

{id:"sample",title:"Borrowed Sound",band:4,worlds:["music","art"],genre:"Discussion",subject:"Music · Social studies",
blurb:"Six seconds of drumming from 1969 became one of the most reused recordings ever. Its drummer was never paid. Is sampling creating, or taking?",
paras:[
"In 1969, a soul band called The Winstons released a B side with a drum solo of about six seconds in the middle of it. It was not a hit. But in the decades that followed, that short drum break, often called the Amen break after the song’s title, was cut up, sped up and looped into thousands of tracks, from early hip hop to drum and bass to video game soundtracks. It may be one of the most reused recordings in history. The drummer who played it, Gregory Coleman, reportedly never received any payment for that reuse, and died in poverty.",
"That story sits at the centre of an argument as old as recorded music: when an artist takes a piece of someone else’s recording and builds something new from it, are they creating, or taking?",
"The case for sampling as creativity is strong. Music has always been built from borrowed material. Composers quoted folk songs; jazz musicians reworked popular tunes; blues musicians shared lines and verses freely. Early hip hop producers, often working with little money and no formal training, turned turntables and samplers into instruments in their own right, isolating a few bars from a forgotten record and transforming them through repetition, layering and context. Something genuinely new emerged. To call this mere copying is to misunderstand how art has always worked.",
"Yet the case against unpaid sampling is also strong, and the Amen break illustrates it painfully. A recording is not just an idea; it is a specific performance, captured through someone’s skill and labour. When that performance becomes the foundation of a commercially successful track, it is hard to justify the original performer receiving nothing. The power imbalance often ran in one direction: many early samples were taken from Black musicians who had themselves been underpaid by record labels.",
"Over time, courts and the music industry moved towards a licensing system: if you want to sample a recording, you must get permission and, usually, pay. In the United States, some judges took a particularly strict line, suggesting that even very short samples could require a licence. This has protected some artists’ income. But it has also had costs. Clearing a sample can be expensive and slow, which favours established artists with lawyers and budgets over young producers making music in their bedrooms. Some critics argue that it has made certain sample-heavy styles almost impossible to release legally.",
"Perhaps the most persuasive position lies between the extremes. Sampling can be a deeply creative act and still carry obligations. A fair system would make it easy and affordable to license short samples, ensure that payments reach performers rather than only the companies that own the rights, and protect uses that add substantial new meaning. Some of these ideas are already being tried; none has been fully achieved.",
"In 2015, two DJs in the United Kingdom started an online fundraiser for Richard Spencer, the band leader who held the copyright to the song. It raised a sum that was generous for a fundraiser and tiny compared with the music built on his band’s work. It was a kind gesture. It also came nearly half a century late. Gratitude is good. A system that did not depend on it would be better."],
vocab:[["isolating","Separating one part from everything around it.","The producer isolated the vocal so it could be remixed."],
["transforming","Changing something completely in form or character.","The mural transformed the grey wall into a forest."],
["licensing","Giving or getting official permission, often for payment, to use something.","The café pays for licensing so it can play music."],
["obligations","Things you must do because of a rule, promise or duty.","Being in the team comes with obligations, like turning up to training."]],
qs:[
["lit","Why is the Amen break famous?",["A few seconds of drumming were reused in thousands of later tracks","It was a number-one hit in 1969","It was the first drum and bass album","It changed copyright law in Aotearoa"],"The text says it was “cut up, sped up and looped into thousands of tracks”, even though the original record “was not a hit”.","was cut up, sped up and looped into thousands of tracks"],
["pur","Why does the essay open with the story of the Amen break?",["It is a concrete example that shows both the creativity and the unfairness of sampling","To sell more Winstons records","To argue that drum solos are boring","To give a full history of hip hop"],"Paragraph 2 says the story “sits at the centre of an argument”. It holds both sides: a creative explosion and an unpaid drummer.","That story sits at the centre of an argument as old as recorded music"],
["str","How is the essay organised?",["Story, question, case for, case against, the legal response, a middle position, then back to the story","A history in strict time order only","A problem followed by one side’s solution","A list of famous samples"],"This is a discussion structure. The signal “Perhaps the most persuasive position lies between the extremes” shows the writer weighing both sides before concluding.","Perhaps the most persuasive position lies between the extremes."],
["voc","Producers were “transforming them through repetition, layering and context”. What does transforming mean?",["Changing them so much they become something new","Copying them exactly","Deleting them","Selling them"],"The next sentence confirms it: “Something genuinely new emerged.” To transform is to change the form or character of something.","isolating a few bars from a forgotten record and transforming them through repetition, layering and context"],
["inf","Why does the writer point out that strict licensing favours “established artists with lawyers and budgets”?",["To show an unintended cost: young or poorer producers struggle to sample legally","To praise lawyers","To show licensing has no downsides","To argue that sampling should be banned"],"The writer admits licensing “has protected some artists’ income. But it has also had costs.” Who can afford permission matters.","Clearing a sample can be expensive and slow, which favours established artists with lawyers and budgets over young producers making music in their bedrooms."],
["eva","Why is “reportedly” a careful choice in the sentence about Gregory Coleman?",["It signals the claim comes from reports the writer hasn’t personally confirmed","It shows the writer thinks it is false","It is a musical term","It means it happened recently"],"Careful writers mark claims they cannot verify directly. “Reportedly” keeps the claim honest without hiding it.","The drummer who played it, Gregory Coleman, reportedly never received any payment for that reuse, and died in poverty."],
["inf","“Gratitude is good. A system that did not depend on it would be better.” What is the writer suggesting?",["Fair payment shouldn’t rely on strangers’ kindness; it should be built into the system","Gratitude is useless","Fans should donate more often","Fundraisers are the best solution"],"The fundraiser was kind but “nearly half a century late”. The writer wants fairness to be guaranteed, not left to chance.","Gratitude is good. A system that did not depend on it would be better."],
["main","Which best describes the writer’s overall position?",["Sampling can be creative but still owes something to performers, so a fair, affordable licensing system is needed","Sampling is always theft","Sampling should be completely free","Current courts have solved the problem"],"Paragraph 6 states the position: sampling is creative “and still carry obligations”, and it lists features of a fair system.","Sampling can be a deeply creative act and still carry obligations."]]},

{id:"data",title:"Measured to the Last Watt",band:4,worlds:["sport","bike"],genre:"Persuasive",subject:"Health and PE",
blurb:"Power meters, GPS vests and leaderboards came from elite sport. Are they helping young riders, or taking the joy out of it?",
paras:[
"There is a moment, about two-thirds of the way down a long forest descent, when a rider stops thinking. The trail arrives faster than words can, and the body takes over: weight back, eyes up, a small lift of the front wheel over a root you never consciously saw. Riders call it flow. It is the reason many of us ride at all. And it is increasingly something that young athletes are taught to measure, upload and compare.",
"Elite sport has embraced data with enormous success. Professional cyclists train using power meters that measure their effort in watts, second by second. Rugby players wear GPS units between their shoulder blades that track distance, speed and impacts. The idea of marginal gains, improving many small things by one per cent each, is credited with helping to transform British track cycling in the 2000s, and the approach has spread across sport. At the top level, where races are won by fractions of a second, it makes sense.",
"The problem is that the tools of the top level have trickled down to everyone else, often without the expertise or the purpose that made them useful. A thirteen-year-old can now compare every ride against thousands of strangers on a segment leaderboard, receive automated messages about their “fitness” and “form”, and watch a number fall when they take a week off. For some, this is motivating. For others, it quietly converts something they loved for its own sake into a performance to be judged.",
"Psychologists distinguish between intrinsic motivation, doing something because it is satisfying in itself, and extrinsic motivation, doing it for a reward, a ranking or someone else’s approval. Research on young people in sport has repeatedly linked enjoyment and long-term participation more strongly with the former. Constant measurement does not automatically destroy intrinsic motivation, but it can crowd it out, particularly when the numbers are public and the comparisons are endless. Many young New Zealanders drop out of organised sport in their teenage years, and while the reasons are many, a sense that sport has stopped being fun is consistently among them.",
"None of this means data is the enemy. A heart-rate monitor can teach a young athlete what genuinely easy training feels like. A coach who looks at the numbers with a rider, and asks what they noticed, is teaching self-awareness rather than obsession. The question is not whether to measure, but who the measurement serves, and when.",
"A sensible approach would treat data as a tool to be picked up deliberately, not a constant companion. Young athletes might log rides privately rather than publicly, track a few meaningful measures rather than dozens, and regularly ride with no device at all. Coaches and parents could ask “Did you enjoy that?” before they ask “What was your time?”",
"The best riders I know are not the ones with the most data. They are the ones who still grin at the bottom of the hill. That grin does not show up on any graph. It may be the most important thing we are measuring for."],
vocab:[["embraced","Eagerly accepted or taken up.","The school embraced the new timetable."],
["trickled down","Spread slowly from the top level to everyone else.","The fashion trickled down from catwalks to shopping malls."],
["intrinsic","Coming from inside yourself; valued for its own sake.","Her intrinsic love of drawing kept her sketching even without praise."],
["deliberately","On purpose, after careful thought.","He deliberately left his phone at home for the tramp."]],
qs:[
["lit","What do power meters measure?",["A rider’s effort in watts, second by second","Distance and impacts","Heart rate","Position on a leaderboard"],"Paragraph 2 says power meters “measure their effort in watts, second by second”. GPS units track distance, speed and impacts.","Professional cyclists train using power meters that measure their effort in watts, second by second."],
["pur","Why does the writer open with a description of flow?",["To show what is valuable, and what could be lost through over-measuring","To give technical riding tips","To show the writer is a fast rider","To describe a race"],"Flow is the thing the writer wants to protect. The paragraph ends by noting that young athletes are now taught to measure it, which sets up the argument.","Riders call it flow."],
["voc","The tools of elite sport “have trickled down to everyone else”. What does trickled down mean?",["Spread slowly from the top level to ordinary people","Leaked out by accident","Disappeared","Rolled downhill"],"Like water trickling from a height, the tools have moved gradually from elite sport to everyday athletes.","The problem is that the tools of the top level have trickled down to everyone else"],
["inf","Young riders “watch a number fall when they take a week off”. What problem does this suggest?",["Rest, which is healthy, can be made to feel like failure","The devices are faulty","Rest is bad for young athletes","Numbers should never fall"],"A falling score after a rest week turns a sensible choice into something that looks like going backwards.","and watch a number fall when they take a week off"],
["lit","According to the text, what is intrinsic motivation?",["Doing something because it is satisfying in itself","Doing something for a reward","Doing something for a parent’s approval","Doing something to climb a ranking"],"The writer defines both terms in paragraph 4. Rewards, rankings and approval are examples of extrinsic motivation.","Psychologists distinguish between intrinsic motivation, doing something because it is satisfying in itself"],
["eva","Which best evaluates the use of evidence in paragraph 4?",["It is careful, noting that measurement doesn’t automatically destroy motivation, but it names no specific studies or figures","It proves that data causes young people to quit","It makes no claims at all","It relies entirely on statistics"],"The writer hedges (“does not automatically”, “can crowd it out”) and refers to research only in general terms. Careful, but a sceptical reader would want sources.","Constant measurement does not automatically destroy intrinsic motivation, but it can crowd it out"],
["str","What is the role of paragraph 5 (“None of this means data is the enemy”)?",["It concedes the benefits of data, balancing the argument before the writer proposes solutions","It starts a new topic","It is the conclusion","It tells a story about a coach"],"A concession shows fairness and makes the final proposal more reasonable: measure deliberately, not constantly.","None of this means data is the enemy."],
["main","What is the writer’s main argument?",["Data should be used deliberately to serve young athletes, without replacing enjoyment","Young athletes should never use data","Data only matters for elite athletes","Leaderboards are the best motivation"],"The key line is “The question is not whether to measure, but who the measurement serves, and when.”","The question is not whether to measure, but who the measurement serves, and when."]]}
];

/* ───────────── worlds, bands, skills ───────────── */
const ICON={
bike:'<circle cx="6" cy="16.5" r="3.8"/><circle cx="18" cy="16.5" r="3.8"/><path d="M6 16.5l3.6-7.5h5.2l3.2 7.5M9.6 9l3.4 7.5H6M13.4 5.5h3"/>',
sea:'<path d="M3 11.5c3-4 9-5 13 0-4 5-10 4-13 0z"/><path d="M16 11.5l5-3v6z"/><circle cx="7" cy="10.6" r=".9" fill="currentColor" stroke="none"/><path d="M2 19c2 1.2 4 1.2 6 0s4-1.2 6 0 4 1.2 6 0"/>',
music:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none"/><path d="M12 5.4a6.6 6.6 0 0 1 6.6 6.6"/>',
art:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.6-1.3-1.9-1.3-3.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-3.9-4-7-9-7z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
gaming:'<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="18" cy="13.6" r=".9" fill="currentColor" stroke="none"/>',
space:'<circle cx="12" cy="12" r="4.6"/><ellipse cx="12" cy="12" rx="10" ry="3.2" transform="rotate(-20 12 12)"/><path d="M19 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
sport:'<circle cx="12" cy="12" r="9"/><path d="M5.6 6.2c3 2.6 3 9 0 11.6M18.4 6.2c-3 2.6-3 9 0 11.6"/>',
animals:'<path d="M4 15c0-4.4 3.2-8 7.4-8 3 0 5 2 5.2 4.2l3.9 1.2-4 1.1c-1 3.2-4 5.5-7.3 5.5H4l2.6-2"/><circle cx="13.3" cy="10.2" r=".9" fill="currentColor" stroke="none"/>',
cooking:'<path d="M4 10.5h16v2.5a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2.5 10.5h19M9 3.5c-1 1.2 1 2.2 0 3.6M13.5 3.5c-1 1.2 1 2.2 0 3.6"/>',
building:'<path d="M13.5 3.5l6.5 6.5-2.2 2.2-6.5-6.5z"/><path d="M12.4 7.5L3.8 16.1a1.6 1.6 0 0 0 2.3 2.3l8.6-8.6"/>'};
const WORLDS=[["bike","Downhill mountain biking"],["sea","Fishing and the sea"],["music","Music and vinyl"],["art","Art and design"],["gaming","Gaming and arcades"],["space","Space"],["sport","Sport"],["animals","Animals"],["cooking","Cooking"],["building","Building and making"]];
const WN=Object.fromEntries(WORLDS);
const BANDS=[null,{years:"Years 7–8",lex:"≈700–850L",wpm:150},{years:"Years 9–10",lex:"≈850–1000L",wpm:180},{years:"Year 11",lex:"≈1000–1150L",wpm:210},{years:"Years 12–13",lex:"≈1150–1400L",wpm:240}];
const SK={lit:["Literal recall","Recall"],voc:["Vocabulary in context","Vocab"],inf:["Inference","Inference"],main:["Main idea","Main idea"],pur:["Author’s purpose & technique","Purpose"],str:["Text structure","Structure"],eva:["Evaluate & argue","Evaluate"]};
const SKO=["lit","voc","inf","main","pur","str","eva"];
const TIP={lit:"Slow down a little on the first read and notice names, numbers and facts. After each paragraph, say one fact to yourself before moving on.",
voc:"When a word is new, reread the sentence around it and swap in a word you know. If the sentence still makes sense, you’ve probably got it.",
inf:"Ask “How do I know?” Find two clues in the text and join them to what you already know. Inference is clues plus thinking.",
main:"After reading, sum up the whole text in one sentence of 15 words or fewer. Check it against the title and the last paragraph.",
pur:"Ask “Why did the writer put this here?” Look hard at openings, endings, comparisons and short punchy lines.",
str:"Notice signal words like first, however, yet and as a result. Sketch the text as boxes: what job does each paragraph do?",
eva:"Ask “How strong is the evidence?” Separate facts from opinions, look for the other side, and notice careful words like may or reportedly."};
const MODES={guided:["Guided window","A soft band reveals the text line by line at your pace. It speeds up as you get stronger."],free:["Free read","The whole text, a quiet timer, and you. Press Finished when you’re done."],focus:["Focus","One sentence at a time under a soft spotlight. Great for busy brains."]};

/* ───────────── prepare texts ───────────── */
const norm=s=>String(s).replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g," ").trim().toLowerCase();
const splitSent=p=>p.split(/(?<=[.!?][”"’)]*)\s+(?=[“"‘(]?[A-ZĀĒĪŌŪ0-9])/u);
const TX={};
TEXTS.forEach(t=>{t.poem=t.genre==="Poem";t.units=[];let w=0;
  t.paras.forEach((p,pi)=>{(t.poem?p.split("\n"):splitSent(p)).forEach(u=>{const ws=u.split(/\s+/).filter(Boolean);t.units.push({pi,text:u,words:ws,w0:w});w+=ws.length})});
  t.words=w;
  t.qs.forEach(q=>{const e=norm(q[4]);q.si=t.units.findIndex(u=>norm(u.text).includes(e));
    if(q.si<0){const pi=t.paras.findIndex(p=>norm(p).includes(e));q.si=pi>=0?t.units.findIndex(u=>u.pi===pi&&e.includes(norm(u.text).slice(0,24))):-1}});
  TX[t.id]=t});

/* ───────────── storage ───────────── */
const KEY="readingmachine.v1";
const DEF={v:1,interests:[],band:0,wpm:0,mode:"guided",hi:0,lo:0,boosts:0,sessions:[],xp:0,badges:{},name:"",prove:0,flags:{},prefs:{easy:false,size:19,aloud:false,theme:"auto"}};
const clone=o=>JSON.parse(JSON.stringify(o));
function load(){try{const r=JSON.parse(localStorage.getItem(KEY)||"null");if(r&&r.v===1)return Object.assign(clone(DEF),r,{prefs:Object.assign({},DEF.prefs,r.prefs||{}),flags:r.flags||{}})}catch(e){}return clone(DEF)}
let S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function logStudy(kind){try{const L=JSON.parse(localStorage.getItem("studylog")||"[]");L.push({d:nzDate(),m:"read",kind,t:Date.now()});localStorage.setItem("studylog",JSON.stringify(L.slice(-800)))}catch(e){}}
const nzDate=(t=Date.now())=>new Date(t).toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"});

/* ───────────── sound: the kit's sfx when present, plus a soft page-turn and chime of our own ───────────── */
let muted=false;try{muted=localStorage.getItem("studysound")==="off"}catch(e){}
const kitMutedAtLoad=muted;let AC=null,armed=false;
["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{armed=true},{capture:true,passive:true}));
function ac(){if(!armed)return null;try{if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C()}if(AC.state==="suspended")AC.resume();return AC}catch(e){return null}}
function tone(f,dur,type,gain,when=0,to){const a=ac();if(!a)return;const t=a.currentTime+when,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+0.03)}
function rustle(dur,f0,f1,gain,when=0){const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++){const x=i/n;d[i]=(Math.random()*2-1)*Math.sin(Math.PI*x)*(0.6+0.4*Math.sin(x*40))}
  const s=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime+when;s.buffer=b;bp.type="bandpass";bp.Q.value=0.9;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.value=gain;s.connect(bp).connect(g).connect(a.destination);s.start(t)}
const OWN={page:()=>{rustle(0.32,900,3800,0.11);rustle(0.12,2600,1400,0.05,0.26)},
  chime:()=>{tone(1318,1.1,"sine",0.035);tone(1976,0.8,"sine",0.016,0.02);tone(2637,0.5,"sine",0.007,0.04)},
  tick:()=>tone(1700,0.025,"sine",0.016),pop:()=>tone(520,0.07,"sine",0.045,0,880),whoosh:()=>rustle(0.22,500,2400,0.06),
  ding:()=>{tone(1046,0.7,"sine",0.04);tone(1568,0.5,"sine",0.018,0.01)},buzz:()=>{tone(220,0.22,"triangle",0.04,0,170)},
  win:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,0.35,"triangle",0.04,i*0.08));tone(2093,0.8,"sine",0.014,0.32)}};
function sfx(n){if(muted)return;try{const k=window.StudyKit&&window.StudyKit.sfx;if(k&&!kitMutedAtLoad&&n!=="page"&&n!=="chime"){k(n);return}(OWN[n]||OWN.pop)()}catch(e){}}

/* ───────────── read aloud ───────────── */
const TTS=(()=>{const ok=typeof window.speechSynthesis!=="undefined"&&typeof window.SpeechSynthesisUtterance!=="undefined";let voice=null,run=0;
  function pick(){try{const v=speechSynthesis.getVoices();voice=v.find(x=>/en[-_]NZ/i.test(x.lang))||v.find(x=>/en[-_]AU/i.test(x.lang))||v.find(x=>/en[-_]GB/i.test(x.lang))||v.find(x=>/^en/i.test(x.lang))||null}catch(e){}}
  if(ok){pick();try{speechSynthesis.addEventListener("voiceschanged",pick)}catch(e){}}
  function stop(){run++;if(ok)try{speechSynthesis.cancel()}catch(e){}}
  // speak a list of chunks in order; onWord(chunkIndex, charIndex)
  function chain(chunks,{onWord,onChunk,onEnd}={}){stop();if(!ok){onEnd&&onEnd();return}const id=run;let i=0;
    const next=()=>{if(id!==run)return;if(i>=chunks.length){onEnd&&onEnd();return}const ci=i++;onChunk&&onChunk(ci);
      const u=new SpeechSynthesisUtterance(chunks[ci]);if(voice){u.voice=voice;u.lang=voice.lang}else u.lang="en-NZ";u.rate=0.95;
      u.onboundary=e=>{if(id===run&&(!e.name||e.name==="word"))onWord&&onWord(ci,e.charIndex)};u.onend=next;u.onerror=()=>{if(id===run)next()};
      try{speechSynthesis.speak(u)}catch(e){onEnd&&onEnd()}};next()}
  return{ok,chain,stop,name:()=>voice?`${voice.name} (${voice.lang})`:"your device’s voice"}})();

/* ───────────── helpers ───────────── */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const FAST=Math.max(1,Math.min(200,+(new URLSearchParams(location.search).get("fast"))||1));
const RM_REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const mmss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const r5=x=>Math.round(x/5)*5,clampW=x=>Math.max(80,Math.min(450,x));
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function order(tid,qi){const r=rng(hash(tid+":"+qi)),a=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const svg=(p,c="")=>`<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const levelFloor=n=>50*n*(n-1);
const levelOf=xp=>{let n=1;while(xp>=levelFloor(n+1))n++;return n};
function streak(){const days=new Set(S.sessions.map(x=>x.d));let n=0,t=Date.now();if(!days.has(nzDate(t)))t-=864e5;while(days.has(nzDate(t))){n++;t-=864e5}return n}
function skillTotals(list=S.sessions){const o={};SKO.forEach(k=>o[k]=[0,0]);list.forEach(x=>Object.entries(x.skills||{}).forEach(([k,[c,n]])=>{o[k][0]+=c;o[k][1]+=n}));return o}
const speedSessions=()=>S.sessions.filter(x=>!x.listened&&!x.skim),SKIM=700;

/* ───────────── badges ───────────── */
const BADGES=[
["first","First page","Finish your first text","1",()=>S.sessions.length>=1],
["five","Five texts","Finish five texts","5",()=>S.sessions.length>=5],
["sharp","Sharp eye","Every answer right on a text","✓",()=>S.sessions.some(x=>x.comp===100)],
["speed","Speed step","Your guide speed went up","↑",()=>!!S.flags.speedUp],
["band","Level jump","Moved up a band","▲",()=>!!S.flags.bandUp],
["prove","Proof finder","Used “Prove it” five times","¶",()=>S.prove>=5],
["worlds","World explorer","Read in three worlds","◎",()=>new Set(S.sessions.flatMap(x=>(TX[x.tid]||{worlds:[]}).worlds)).size>=3],
["modes","Mode switcher","Tried all three reading modes","⇄",()=>["guided","free","focus"].every(m=>S.sessions.some(x=>x.mode===m))],
["streak3","Three-day streak","Read on three days in a row","3d",()=>streak()>=3],
["words","Word collector","Met 20 key words","Aa",()=>S.sessions.length*4>=20]];

/* ───────────── adaptive engine ───────────── */
function adapt(comp,listened){const r={from:S.wpm,bandFrom:S.band,kind:"hold",lines:[]};
  if(listened){r.kind="listen";r.lines.push("You used read-aloud this time, so your speed and band stay where they are. Your answers still count towards your skills.")}
  else if(comp>=80){S.hi++;S.lo=0;
    if(S.hi>=2){S.hi=0;S.boosts++;S.wpm=clampW(r5(S.wpm*1.1));S.flags.speedUp=1;r.kind="up";r.lines.push(`Two texts in a row at 80% or better, so your guide speed goes up: ${r.from} → ${S.wpm} words a minute.`);
      if(S.boosts>=2&&S.band<4){S.boosts=0;S.band++;S.wpm=clampW(r5(S.wpm*0.92));S.flags.bandUp=1;r.kind="bandup";r.lines.push(`That’s two speed-ups at this level, so your texts move up to Band ${S.band} (${BANDS[S.band].years}). The pace eases back to ${S.wpm} while you settle in.`)}}
    else{r.kind="almost";r.lines.push(`Strong understanding. One more text at 80% or better and your speed goes up.`)}}
  else if(comp<60){S.lo++;S.hi=0;S.boosts=Math.max(0,S.boosts-1);S.wpm=clampW(r5(S.wpm*0.9));r.kind="down";r.lines.push(`Under 60% this time, so the guide slows down to give you more thinking time: ${r.from} → ${S.wpm} words a minute.`);
    if(S.lo>=2&&S.band>1){S.lo=0;S.band--;r.kind="banddown";r.lines.push(`Two tricky texts in a row, so the next ones come from Band ${S.band}. Build up there, then climb back.`)}}
  else{S.hi=0;S.lo=0;r.lines.push(`${comp}% is solid. Your speed stays at ${S.wpm} words a minute. This is the zone where reading grows.`)}
  r.to=S.wpm;r.bandTo=S.band;return r}

function recommend(){const b=S.band||2,read=S.sessions.map(x=>x.tid);
  const score=t=>{let s=Math.abs(t.band-b)*10;if(S.interests.length&&!t.worlds.some(w=>S.interests.includes(w)))s+=4;const k=read.lastIndexOf(t.id);if(k>=0)s+=25+(k-read.length+12);return s};
  return TEXTS.slice().sort((x,y)=>score(x)-score(y)||TEXTS.indexOf(x)-TEXTS.indexOf(y))[0]}

/* ───────────── shell ───────────── */
const css=`
:root{--rm-cream:#FBF3DF;--rm-cream-ink:#3B2A33;--rm-band:rgba(255,216,77,.36);--rm-gold:#E8B500;--rm-mask:.08;--rm-size:19px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--rm-cream:#2A2219;--rm-cream-ink:#F3E8D0;--rm-band:rgba(255,216,77,.17);--rm-gold:#FFD84D}}
:root[data-theme="dark"]{--rm-cream:#2A2219;--rm-cream-ink:#F3E8D0;--rm-band:rgba(255,216,77,.17);--rm-gold:#FFD84D}
.rm-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rm-tools .lab{font:500 10.5px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted);margin-right:2px}
.rm-tools output{font:500 12px var(--as-mono);color:var(--as-ink);min-width:4ch;text-align:center;font-variant-numeric:tabular-nums}
.rm-tools .grp{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--as-line);border-radius:999px;padding:2px}
.rm-tools .grp .btn{border-color:transparent;padding:4px 9px}
.rm-status{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rm-pill{font:500 11px var(--as-mono);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--as-line);border-radius:999px;padding:5px 10px;color:var(--as-ink);display:inline-flex;gap:7px;align-items:center;white-space:nowrap}
.rm-pill .bar{width:44px;height:5px;border-radius:3px;background:var(--as-soft);overflow:hidden}.rm-pill .bar i{display:block;height:100%;background:var(--rm-gold)}
.rm-pill svg{width:13px;height:13px}
.step[disabled]{opacity:.42;cursor:not-allowed}
.step .n svg{width:11px;height:11px}
.rm-sep{height:1px;background:var(--as-line);margin:6px 4px;flex:none}
.rm .bench{overflow:clip}
.rm .stage{gap:18px;padding:20px}
.rm-h{font:500 10.5px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted);margin:0 0 9px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.rm-h em{font-style:normal;text-transform:none;letter-spacing:0;font-family:var(--as-font);font-size:12.5px;color:var(--as-muted)}
.rm-lead{font-size:16px;color:var(--as-ink);margin:0;max-width:64ch;line-height:1.45}
.rm-worlds{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.rm-world{appearance:none;border:1px solid var(--as-line);background:var(--as-card);border-radius:12px;padding:12px 11px 10px;display:grid;justify-items:start;gap:7px;text-align:left;color:var(--as-ink);font:600 13.5px/1.2 var(--as-font);cursor:pointer;position:relative;transition:transform .18s ease,border-color .18s,background .18s,box-shadow .18s}
.rm-world svg{width:28px;height:28px}
.rm-world small{font:500 10.5px var(--as-mono);color:var(--as-muted)}
.rm-world:hover{border-color:var(--as-muted);transform:translateY(-1px)}
.rm-world[aria-pressed="true"]{background:var(--rm-gold);border-color:var(--as-ink);box-shadow:0 2px 0 var(--as-ink);color:var(--as-onsun)}
.rm-world[aria-pressed="true"] small{color:#5A4300}
.rm-world[aria-pressed="true"]::after{content:"";position:absolute;top:10px;right:10px;width:16px;height:16px;border-radius:50%;background:var(--as-onsun) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.3l2.2 2.2 4.8-5' fill='none' stroke='%23FFFDFB' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat}
.rm-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:18px}
.rm-seg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-width:340px}
.rm-seg .btn{padding:8px 13px}
.rm-seg .btn[aria-pressed="true"]{background:var(--as-ink);color:var(--as-card)}
.rm-note{font-size:13px;color:var(--as-text);margin:8px 0 0;max-width:60ch}
.rm-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rm-mode{appearance:none;border:1px solid var(--as-line);background:var(--as-card);border-radius:12px;padding:10px 12px 12px;text-align:left;cursor:pointer;color:var(--as-ink);display:grid;gap:6px;align-content:start;transition:border-color .18s,box-shadow .18s}
.rm-mode b{font:600 14px var(--as-font)}.rm-mode span{font-size:12.5px;line-height:1.35;color:var(--as-text)}
.rm-mode svg{width:100%;height:38px;color:var(--as-ink)}
.rm-mode:hover{border-color:var(--as-muted)}
.rm-mode[aria-pressed="true"]{border-color:var(--as-ink);box-shadow:inset 0 0 0 1px var(--as-ink),0 2px 0 var(--as-ink)}
.rm-next{border:1.5px solid var(--as-ink);border-radius:14px;padding:16px 18px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 18px;align-items:center;background:var(--as-soft)}
.rm-next h3{margin:2px 0 4px;font:600 23px/1.15 var(--as-font);color:var(--as-ink);letter-spacing:-.01em}
.rm-next p{margin:0;color:var(--as-text);font-size:14px;max-width:62ch}
.rm-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.rm-chip{font:500 10.5px var(--as-mono);letter-spacing:.04em;border:1px solid var(--as-line);border-radius:999px;padding:2px 8px;color:var(--as-ink);background:var(--as-card);white-space:nowrap}
.rm-chip.w{border-color:var(--as-ink)}
.btn.go{background:var(--as-ink);color:var(--as-card);padding:10px 18px;font-size:13px;box-shadow:0 2px 0 var(--rm-gold)}
.btn.go:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.btn.big{padding:9px 16px;font-size:12.5px}
.rm-lib summary{cursor:pointer;font:500 12px var(--as-mono);color:var(--as-ink);list-style:none;display:inline-flex;gap:8px;align-items:center;border:1px solid var(--as-line);border-radius:999px;padding:6px 12px}
.rm-lib summary::-webkit-details-marker{display:none}
.rm-lib[open] summary{border-color:var(--as-ink)}
.rm-libgrid{display:grid;gap:14px;margin-top:12px}
.rm-libband h4{margin:0 0 6px;font:500 10.5px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted)}
.rm-librow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:8px 0;border-top:1px dashed var(--as-line)}
.rm-librow b{color:var(--as-ink);font-weight:600}.rm-librow .meta{font:500 11px var(--as-mono);color:var(--as-muted)}
.rm-librow .done{color:var(--as-good)}
.rm-warm{display:grid;gap:16px;justify-items:center;text-align:center;padding:6px 0 4px}
.rm-ring{width:64px;height:64px}.rm-ring circle{fill:none;stroke-width:5}.rm-ring .bg{stroke:var(--as-soft)}.rm-ring .fg{stroke:var(--rm-gold);stroke-linecap:round;transform:rotate(-90deg);transform-origin:center}
.rm-ring text{font:600 18px var(--as-mono);fill:var(--as-ink)}
.rm-cards{display:grid;grid-template-columns:repeat(2,minmax(0,300px));gap:14px;justify-content:center;width:100%}
.rm-flash{appearance:none;border:0;background:none;padding:0;perspective:900px;cursor:pointer;height:210px;width:100%;display:block;font:inherit;color:inherit;text-align:center}
.rm-flash .in{display:block;position:relative;width:100%;height:100%;transition:transform .6s cubic-bezier(.3,.7,.2,1);transform-style:preserve-3d}
.rm-flash.on .in{transform:rotateY(180deg)}
.rm-flash .f,.rm-flash .b{position:absolute;inset:0;border-radius:14px;border:1.5px solid var(--as-ink);backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;align-content:center;gap:8px;padding:18px;background:var(--as-card)}
.rm-flash .f{background:var(--as-soft);box-shadow:0 3px 0 var(--as-ink)}
.rm-flash .f b{font:600 30px/1.1 var(--as-font);color:var(--as-ink);letter-spacing:-.01em}
.rm-flash .f small,.rm-flash .b small{font:500 10.5px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted)}
.rm-flash .b{transform:rotateY(180deg);text-align:left;align-content:start}
.rm-flash .b p{margin:0;color:var(--as-ink);font-size:15px;line-height:1.4}.rm-flash .b i{color:var(--as-text);font-size:14px;line-height:1.4}
.rm-meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;justify-content:space-between}
.rm-meta h2{margin:0;font:600 clamp(22px,3vw,30px)/1.1 var(--as-font);color:var(--as-ink);letter-spacing:-.015em}
.rm-bar{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;position:sticky;top:8px;z-index:6;background:var(--as-card);border:1px solid var(--as-ink);border-radius:18px;padding:7px 10px;box-shadow:0 6px 18px -12px rgba(36,11,33,.35)}
.rm-bar .ctlgrp{display:inline-flex;align-items:center;gap:4px}
.rm-bar .val{font:500 12px var(--as-mono);color:var(--as-ink);font-variant-numeric:tabular-nums;min-width:8ch;text-align:center}
.rm-prog{flex:1 1 120px;height:6px;background:var(--as-soft);border-radius:3px;overflow:hidden;min-width:80px}.rm-prog i{display:block;height:100%;width:0;background:var(--rm-gold);border-radius:3px;transition:width .3s}
.rm-page{position:relative;background:var(--as-card);border:1px solid var(--as-line);border-radius:16px;padding:30px clamp(18px,4vw,48px) 30px 58px;font-size:var(--rm-size);line-height:1.78;color:var(--as-ink);transition:background .3s,color .3s}
.rm-page .rm-p{margin:0 0 .95em;max-width:64ch;position:relative}
.rm-page .rm-p.poem{margin-bottom:1.3em;line-height:1.7}
.rm-page .pn{position:absolute;left:-38px;top:.45em;font:500 10.5px/1 var(--as-mono);color:var(--as-muted);width:24px;text-align:right;user-select:none}
.rm-page .ttl{font:600 1.18em/1.25 var(--as-font);margin:0 0 .9em;max-width:64ch}
.rm-easy .rm-page{background:var(--rm-cream);color:var(--rm-cream-ink);letter-spacing:.035em;word-spacing:.16em;line-height:1.98;border-color:transparent}
.rm-easy .rm-page .rm-p{max-width:58ch}
.rm-page .w{transition:opacity .4s ease}
.mode-guided .w.ah{opacity:var(--rm-mask)}.mode-guided .w.pa{opacity:.5}
.rm-band{position:absolute;border-radius:9px;background:var(--rm-band);box-shadow:inset 3px 0 0 var(--rm-gold);pointer-events:none;transition:top .34s cubic-bezier(.3,.7,.2,1),left .34s,width .34s,height .34s;z-index:0}
.rm-band i{position:absolute;left:0;bottom:0;height:2px;width:0;background:var(--rm-gold);border-radius:2px}
.rm-page .rm-p,.rm-page .ttl{position:relative;z-index:1}
.mode-focus .s{opacity:.12;transition:opacity .5s ease,background .5s}
.mode-focus .s.lit{opacity:1;background:var(--rm-band);box-shadow:0 0 0 .22em var(--rm-band),0 0 1.4em .5em var(--rm-band);border-radius:.3em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.mode-focus.done .s{opacity:1;background:none;box-shadow:none}
.rm-page.veil .rm-txt{filter:blur(7px);opacity:.3;user-select:none;pointer-events:none}
.rm-page .w.spk{background:var(--rm-gold);color:var(--as-onsun);border-radius:3px;box-shadow:0 0 0 2px var(--rm-gold);opacity:1!important}
.rm-ready{position:absolute;inset:0;display:grid;place-items:start center;padding-top:clamp(30px,10vh,110px);z-index:4;border-radius:16px;background:linear-gradient(to bottom,transparent,color-mix(in srgb,var(--as-card) 40%,transparent))}
.rm-ready .card{max-width:380px;text-align:center;border:1.5px solid var(--as-ink);box-shadow:0 3px 0 var(--as-ink);display:grid;gap:10px;justify-items:center;padding:18px 20px}
.rm-ready .card p{font-size:14px;color:var(--as-text)}
.rm-ready .card b{font:600 18px var(--as-font);color:var(--as-ink)}
.rm-done{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;border:1.5px solid var(--as-ink);border-radius:14px;padding:12px 14px;background:var(--as-soft);animation:kpop .35s ease}
.rm-done p{margin:0;color:var(--as-ink);font-size:15px}
.rm-quiz{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);gap:16px;align-items:start}
.rm-textwrap{position:sticky;top:10px}
.rm-quiz .rm-page{max-height:calc(100vh - 40px);overflow:auto;font-size:calc(var(--rm-size) * .86);padding-top:22px;scroll-behavior:smooth}
.rm-showtext{display:none}
.rm-qcard{border:1.5px solid var(--as-ink);border-radius:16px;padding:16px 18px 18px;display:grid;gap:14px;background:var(--as-card)}
.rm-qhead{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}
.rm-skill{font:500 10.5px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;background:var(--as-ink);color:var(--as-card);border-radius:5px;padding:3px 7px}
.rm-qn{font:500 11px var(--as-mono);color:var(--as-muted)}
.rm-dots{display:flex;gap:4px;flex:1 1 100%}.rm-dots i{flex:1;height:5px;border-radius:3px;background:var(--as-soft);max-width:42px}
.rm-dots i.ok{background:var(--as-good)}.rm-dots i.no{background:var(--as-warn)}.rm-dots i.cur{background:var(--as-ink)}
.rm-q{font:600 19px/1.35 var(--as-font);color:var(--as-ink);margin:0;text-wrap:pretty}
.rm-opts{display:grid;gap:8px}
.rm-opt{appearance:none;display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;border:1px solid var(--as-line);background:var(--as-card);border-radius:12px;padding:11px 13px;font:15px/1.4 var(--as-font);color:var(--as-ink);cursor:pointer;transition:border-color .15s,transform .15s,background .25s}
.rm-opt b{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--as-soft);font:600 11px var(--as-mono);color:var(--as-ink);margin-top:-1px}
.rm-opt:hover:not([disabled]){border-color:var(--as-ink);transform:translateY(-1px)}
.rm-opt[disabled]{cursor:default}
.rm-opt.right{border-color:var(--as-good);background:color-mix(in srgb,var(--as-good) 13%,var(--as-card))}.rm-opt.right b{background:var(--as-good);color:var(--as-card)}
.rm-opt.wrong{border-color:var(--as-warn);background:color-mix(in srgb,var(--as-warn) 11%,var(--as-card))}.rm-opt.wrong b{background:var(--as-warn);color:var(--as-card)}
.rm-opt.fade{opacity:.55}
.rm-fb{border-radius:12px;padding:13px 15px;background:var(--as-soft);display:grid;gap:9px;animation:kpop .35s ease;border-left:4px solid var(--as-good)}
.rm-fb.no{border-left-color:var(--as-warn)}
.rm-fb .verdict{font:600 16px var(--as-font);color:var(--as-good);display:flex;gap:8px;align-items:center}.rm-fb .verdict svg{width:20px;height:20px;flex:none}.rm-fb.no .verdict{color:var(--as-warn)}
.rm-fb p{margin:0;color:var(--as-ink);font-size:14.5px;line-height:1.45}
.rm-quote{border-left:3px solid var(--rm-gold);padding:3px 0 3px 11px;font-size:14px;color:var(--as-ink);font-style:italic;line-height:1.45}
.rm-quote span{display:block;font:500 10px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted);font-style:normal;margin-bottom:2px}
.rm-fbbtns{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between}
.s.ev{background:color-mix(in srgb,var(--rm-gold) 30%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--rm-gold) 30%,transparent);border-radius:4px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.s.ev.pulse{animation:rmPulse 1.6s ease}
@keyframes rmPulse{0%,100%{background:color-mix(in srgb,var(--rm-gold) 30%,transparent)}25%,60%{background:color-mix(in srgb,var(--rm-gold) 70%,transparent)}}
.rm-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.rm-tile{border:1px solid var(--as-line);border-radius:14px;padding:12px 14px;background:var(--as-card);display:grid;gap:2px;align-content:start}
.rm-tile span{font:500 10.5px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted)}
.rm-tile b{font:600 34px/1.05 var(--as-font);color:var(--as-ink);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.rm-tile b small{font:500 13px var(--as-mono);letter-spacing:0;margin-left:3px;color:var(--as-muted)}
.rm-tile em{font-style:normal;font-size:12.5px;color:var(--as-text)}
.rm-tile.hero{background:var(--rm-gold);border-color:var(--as-ink);box-shadow:0 2px 0 var(--as-ink)}.rm-tile.hero span,.rm-tile.hero b small{color:#5A4300}.rm-tile.hero b,.rm-tile.hero em{color:var(--as-onsun)}
.rm-adapt{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;border:1.5px solid var(--as-ink);border-radius:14px;padding:14px 16px}
.rm-adapt .ic{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--as-soft);border:1.5px solid var(--as-ink);color:var(--as-ink)}
.rm-adapt .ic svg{width:24px;height:24px}
.rm-adapt.up .ic,.rm-adapt.bandup .ic{background:var(--rm-gold);color:var(--as-onsun)}
.rm-adapt h3{margin:0 0 3px;font:600 17px var(--as-font);color:var(--as-ink)}
.rm-adapt p{margin:0;color:var(--as-text);font-size:14px}
.rm-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
.rm-skrow{display:grid;grid-template-columns:minmax(0,11.5em) minmax(0,1fr) 5.6em;gap:8px;align-items:center;font-size:13.5px;color:var(--as-ink);padding:3px 0}
.rm-skrow .tr{height:8px;border-radius:4px;background:var(--as-soft);overflow:hidden}.rm-skrow .tr i{display:block;height:100%;border-radius:4px;background:var(--earth)}
.rm-skrow.weak .tr i{background:var(--as-warn)}
.rm-skrow .v{font:500 11.5px var(--as-mono);text-align:right;white-space:nowrap;color:var(--as-text);font-variant-numeric:tabular-nums}
.rm-vocab{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.rm-vocab div{border:1px solid var(--as-line);border-radius:10px;padding:9px 11px;font-size:13.5px;color:var(--as-text)}
.rm-vocab b{display:block;color:var(--as-ink);font-size:15px}
.rm-badges{display:flex;flex-wrap:wrap;gap:12px 8px}
.rm-badge{display:grid;justify-items:center;gap:5px;width:86px;text-align:center;font:500 10.5px/1.25 var(--as-mono);color:var(--as-ink)}
.rm-badge .m{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:var(--rm-gold);border:1.5px solid var(--as-ink);box-shadow:0 2px 0 var(--as-ink);font:600 15px var(--as-font);color:var(--as-onsun)}
.rm-badge.off{color:var(--as-muted)}.rm-badge.off .m{background:var(--as-soft);border-color:var(--as-line);box-shadow:none;color:var(--as-muted);opacity:.7}
.rm-badge.new .m{animation:rmBadge .7s cubic-bezier(.2,1.6,.4,1)}
@keyframes rmBadge{0%{transform:scale(.3) rotate(-30deg);opacity:0}100%{transform:none;opacity:1}}
.rm-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.rm-level{display:grid;gap:8px;border:1.5px solid var(--as-ink);border-radius:14px;padding:14px 16px}
.rm-level .top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.rm-level b{font:600 24px var(--as-font);color:var(--as-ink)}.rm-level span{font:500 11.5px var(--as-mono);color:var(--as-muted)}
.rm-lbar{height:12px;border-radius:6px;background:var(--as-soft);overflow:hidden}.rm-lbar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--rm-gold),color-mix(in srgb,var(--rm-gold) 70%,var(--hot)))}
.rm-chart{position:relative;border:1px solid var(--as-line);border-radius:14px;padding:12px 12px 6px;background:var(--as-card)}
.rm-chart svg{display:block;width:100%;height:auto;overflow:visible}
.rm-chart .ax{font:500 10px var(--as-mono);fill:var(--as-muted)}
.rm-chart .lbl{font:500 11px var(--as-mono);fill:var(--as-ink)}
.rm-chart .grid{stroke:var(--as-line);stroke-width:1}
.rm-chart .ref{stroke:var(--as-muted);stroke-width:1;stroke-dasharray:3 4}
.rm-tip{position:absolute;pointer-events:none;background:var(--as-ink);color:var(--as-card);font:500 11.5px/1.4 var(--as-mono);padding:6px 9px;border-radius:8px;white-space:nowrap;transform:translate(-50%,-110%);opacity:0;transition:opacity .12s;z-index:3}
.rm-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font:500 11px var(--as-mono);color:var(--as-text);margin:0 0 6px}
.rm-legend i{display:inline-block;width:16px;height:0;border-top:2px solid;vertical-align:3px;margin-right:6px}
.rm-legend i.d{border-top-style:dashed}
.rm-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;max-width:210px}
.rm-cal i{aspect-ratio:1;border-radius:5px;background:var(--as-soft)}.rm-cal i.on{background:var(--rm-gold);box-shadow:inset 0 0 0 1.5px var(--as-ink)}.rm-cal i.today{outline:1.5px solid var(--as-ink);outline-offset:1px}
.rm-table{width:100%;border-collapse:collapse;font-size:13px}
.rm-table th{font:500 10px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted);text-align:left;padding:6px 6px;border-bottom:1px solid var(--as-line)}
.rm-table td{padding:7px 6px;border-bottom:1px dashed var(--as-line);color:var(--as-ink);font-variant-numeric:tabular-nums}
.rm-table td.n{font-family:var(--as-mono);font-size:12px}
.rm-scroll{overflow-x:auto}
.rm-glance{border:1.5px solid var(--as-ink);border-radius:18px;padding:20px 22px;background:var(--as-card);display:grid;gap:16px;max-width:860px}
.rm-glance .gh{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 16px;align-items:flex-end;border-bottom:1px solid var(--as-line);padding-bottom:12px}
.rm-glance .gh h3{margin:0;font:600 22px var(--as-font);color:var(--as-ink)}
.rm-glance .gh input{font:600 16px var(--as-font);color:var(--as-ink);border:0;border-bottom:1.5px dashed var(--as-muted);background:transparent;padding:2px 0;min-width:0;width:16em;max-width:100%}
.rm-glance .gh input:focus{outline:none;border-bottom-color:var(--rm-gold)}
.rm-gstats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.rm-gstats div{background:var(--as-soft);border-radius:12px;padding:10px 12px}
.rm-gstats span{display:block;font:500 10px var(--as-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--as-muted)}
.rm-gstats b{font:600 24px var(--as-font);color:var(--as-ink);font-variant-numeric:tabular-nums}
.rm-gstats em{display:block;font-style:normal;font-size:12px;color:var(--as-text)}
.rm-next2{border-left:4px solid var(--rm-gold);background:var(--as-soft);border-radius:0 12px 12px 0;padding:12px 14px;display:grid;gap:4px}
.rm-next2 b{color:var(--as-ink);font-size:16px}.rm-next2 p{margin:0;font-size:14px;color:var(--as-text)}
.rm-spark{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
.rm-spark > div{border:1px solid var(--as-line);border-radius:12px;padding:10px 12px}
.rm-spark svg{width:100%;height:46px;display:block}
.rm-small{font-size:12px;color:var(--as-muted);margin:0}
.rm-empty{border:1px dashed var(--as-line);border-radius:14px;padding:22px;text-align:center;color:var(--as-text)}
.rm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:820px){
  .rm .stage{padding:14px;gap:16px}
  .rm-sep{width:1px;height:auto;margin:2px 2px}
  .rm-worlds{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rm-row,.rm-two,.rm-quiz{grid-template-columns:1fr}
  .rm-modes{grid-template-columns:1fr}
  .rm-mode{grid-template-columns:96px minmax(0,1fr);grid-template-rows:auto auto;column-gap:12px;align-items:center}
  .rm-mode svg{grid-row:span 2;height:34px}
  .rm-next{grid-template-columns:1fr}
  .rm-next .btn.go{justify-self:start}
  .rm-cards{grid-template-columns:1fr}
  .rm-flash{height:180px}
  .rm-page{padding:22px 16px 22px 34px}
  .rm-page .pn{left:-26px;width:18px}
  .rm-tiles,.rm-gstats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rm-tile b{font-size:28px}
  .rm-textwrap{position:static;order:2}
  .rm-quiz .rm-page{max-height:none;overflow:visible}
  .rm-textwrap.shut .rm-page{display:none}
  .rm-showtext{display:inline-block;margin-bottom:8px}
  .rm-vocab,.rm-spark{grid-template-columns:1fr}
  .rm-glance{padding:16px}
  .rm-bar{top:4px;border-radius:14px}
}
@media (prefers-reduced-motion:reduce){.rm-band,.rm-page .w,.mode-focus .s,.rm-flash .in{transition:none}}
/* assembly shell alignment */
.rm-h,.rm-tools .lab,.rm-libband h4,.rm-tile span,.rm-gstats span,.rm-quote span,.rm-flash .f small,.rm-flash .b small,.rm-table th{font-family:var(--as-font)!important;font-weight:600!important;font-size:11.5px!important;letter-spacing:.08em}
.rm-meta h2,.rm-next h3,.rm-flash .f b,.rm-level b,.rm-glance .gh h3,.rm-adapt h3,.rm-q,.rm-tile b,.rm-gstats b,.rm-page .ttl{font-family:var(--as-display)!important;font-weight:600;letter-spacing:-.01em}
.rm-chip{font:600 11.5px var(--as-font);letter-spacing:.01em;border-color:var(--as-line2);padding:3px 10px}
.rm-chip.w{border-color:var(--as-plum)}
.rm-pill{font:600 11.5px var(--as-font);letter-spacing:.04em;background:var(--as-card)}
.rm-pill .bar i{background:var(--as-sun)}
.rm-world{border-radius:18px;border-width:1.5px}
.rm-world:hover{border-color:var(--as-mint)}
.rm-world[aria-pressed="true"]{background:var(--as-mintsoft);border-color:var(--as-mint);box-shadow:none;color:var(--as-ink)}
.rm-world[aria-pressed="true"] small{color:var(--as-mintink)}
.rm-world[aria-pressed="true"]::after{background-color:var(--as-mintink)}
.rm-mode{border-radius:18px;border-width:1.5px}.rm-mode:hover{border-color:var(--as-mint)}
.rm-mode[aria-pressed="true"]{border-color:var(--as-mint);background:var(--as-mintsoft);box-shadow:none}
.rm-seg .btn[aria-pressed="true"]{background:var(--as-ink);border-color:var(--as-ink);color:var(--as-card)}
.btn.go{background:var(--as-ink);border-color:var(--as-ink);color:var(--as-card);box-shadow:none;padding:10px 20px;font-size:14px}
.btn.go:hover{background:var(--as-plum);border-color:var(--as-plum)}
.rm-next{border:1px solid var(--as-line2);border-radius:22px;background:var(--as-soft);box-shadow:inset 5px 0 0 var(--as-sun)}
.rm-bar{border:1px solid var(--as-line2);border-radius:999px;box-shadow:var(--as-shadow);background:var(--as-card)}
.rm-prog i{background:var(--as-mint)}
.rm-page{border-radius:22px;border-color:var(--as-line);background:var(--as-card)}
.rm-band{box-shadow:inset 3px 0 0 var(--rm-gold)}.rm-band i{background:var(--rm-gold)}
.rm-qcard,.rm-adapt,.rm-level,.rm-glance{border:1px solid var(--as-line2);border-radius:22px;box-shadow:var(--as-shadow)}
.rm-skill{font:600 11px var(--as-font);border-radius:999px;padding:3px 9px}
.rm-opt{border-radius:16px;border-width:1.5px}
.rm-opt:hover:not([disabled]){border-color:var(--as-mint);background:var(--as-mintsoft)}
.rm-fb{border-radius:16px;background:var(--as-soft)}
.rm-tile{border-radius:18px}
.rm-tile.hero{background:var(--as-sun);border-color:var(--as-sun);box-shadow:none}
.rm-tile.hero span,.rm-tile.hero b small{color:#5A4300}
.rm-adapt .ic{background:var(--as-soft);border-color:var(--as-line2)}
.rm-adapt.up .ic,.rm-adapt.bandup .ic{background:var(--as-sun);border-color:var(--as-sun);color:var(--as-onsun)}
.rm-badge{font:600 11px/1.25 var(--as-font)}
.rm-badge .m{background:var(--as-sun);border:1.5px solid var(--as-ink);box-shadow:0 2px 0 var(--as-ink);color:var(--as-onsun);font-family:var(--as-display)}
.rm-badge.off .m{background:var(--as-soft);border-color:var(--as-line2)}
.rm-lbar i{background:var(--as-sun)}
.rm-cal i.on{background:var(--as-sun);box-shadow:inset 0 0 0 1.5px var(--as-ink)}
.rm-flash .f,.rm-flash .b{border-radius:20px;border:1.5px solid var(--as-line2)}
.rm-flash .f{background:var(--as-sunsoft);box-shadow:0 3px 0 var(--as-line2)}
.rm-ring .fg{stroke:var(--rm-gold)}
.rm-next2{border-left-color:var(--as-sun);background:var(--as-soft)}
.rm-ready .card{border:1px solid var(--as-line2);box-shadow:var(--as-shadow);border-radius:22px}
.rm-done{border:1px solid var(--as-line2);border-radius:20px;background:var(--as-soft)}
.rm-lib summary{font:600 13px var(--as-font);border-width:1.5px}
.rm-lib[open] summary{border-color:var(--as-mint)}
.rm-tools .grp{border-width:1.5px}
#rm-allen:empty{display:none}
#rm-stage{grid-template-columns:minmax(0,1fr)}#rm-stage>*{min-width:0}
.rm-qn{font-family:var(--as-font)!important;font-weight:600}
@media (max-width:820px){.rm-skrow{grid-template-columns:minmax(0,9.5em) minmax(0,1fr) 4.6em}}
@media (max-width:820px){.rm-bar{border-radius:20px}}
@media print{body{padding:0}.crumbs,header.mh,.rm-tools,nav.steps,footer,.rm-btns,.rm-noprint{display:none!important}.bench{border:0}.rm .stage{padding:0}.rm-glance{border:1px solid #999;max-width:none}}
`;

const RAIL=[["choose","Choose","1"],["warm","Warm up","2"],["read","Read","3"],["quiz","Questions","4"],["done","Results","5"],null,["progress","My progress",svg('<path d="M4 19V10M10 19V5M16 19v-7M21 19H3"/>')],["glance","Teacher & parent",svg('<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>')]];
let ui={screen:"choose",pick:null},ses=null,raf=0;
const app=document.getElementById("app");
const K=window.StudyKit||null;let allen=null;
function allenSetup(){if(!K||!K.companion)return;try{const nav=$("nav.steps"),slot=$("#rm-allen");allen=K.companion(nav);
    let mq=null;try{mq=matchMedia("(max-width:820px)")}catch(e){}
    const place=()=>{const t=mq&&mq.matches?slot:nav;if(allen.el.parentNode!==t)t.appendChild(allen.el)};place();try{mq&&mq.addEventListener("change",place)}catch(e){}
    const b=$("#rm-al"),sync=()=>{const L=K.allen.load();b.setAttribute("aria-pressed",L.minimal?"true":"false")};sync();
    b.onclick=()=>{const L=K.allen.load();L.minimal=!L.minimal;K.allen.save(L);sync();allen.render();sfx("pop")}}catch(e){allen=null}}
function shell(){const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  app.innerHTML=`<div class="wrap rm">
  <div class="crumbs">${K&&K.lockup?`<a class="as-lock" href="../index.html" aria-label="assembly, by assembl: all study machines">${K.lockup}</a>`:""}<a class="as-back" href="../index.html">← All study machines</a><span>Reading · speed and understanding</span></div>
  <header class="mh"><div><div class="eyebrow">Reading · Years 7–13</div><h1>The reading machine</h1></div><div class="mhr"><div class="rm-status" id="rm-status"></div><button class="btn snd" type="button" id="rm-snd"></button>${K&&K.companion?`<button class="btn al-min" type="button" id="rm-al" aria-pressed="false">Tiny Allen</button>`:""}</div></header>
  <div class="rm-tools" role="toolbar" aria-label="Reading settings">
    <button class="btn tog" type="button" id="rm-easy" title="Wider letter and word spacing, taller lines and a cream page">Easy-read</button>
    <span class="grp" role="group" aria-label="Text size"><button class="btn" type="button" id="rm-sm" aria-label="Smaller text">A−</button><output id="rm-size" aria-live="polite"></output><button class="btn" type="button" id="rm-lg" aria-label="Bigger text">A+</button></span>
    <button class="btn tog" type="button" id="rm-aloud" title="Reads the text and questions out loud, highlighting each word">Read aloud</button>
    <button class="btn" type="button" id="rm-theme"></button>
  </div>
  <section class="bench" aria-label="The reading machine">
    <nav class="steps" aria-label="Session steps"><div class="fig">ADAPTIVE READING</div><h2>Today’s session</h2><div id="rm-rail" style="display:contents"></div></nav>
    <div class="stage"><div id="rm-stage" style="display:grid;gap:inherit;min-width:0"></div><div id="rm-allen"></div></div>
  </section>
  <footer><p><span class="truth">Original</span>Every text and question here is original, written for this machine. Reading levels are approximate: the Lexile-style ranges are rough guides, not official measures. Not affiliated with or endorsed by Reading Plus. Progress is saved only in this browser.</p>${K&&K.lockup?`<p class="as-foot">${K.lockup}<span>assembly is made by assembl in Aotearoa.</span></p>`:`<p>assembly is made by assembl in Aotearoa.</p>`}</footer>
</div>`;
  const rail=$("#rm-rail");
  RAIL.forEach(r=>{if(!r){const d=document.createElement("div");d.className="rm-sep";rail.appendChild(d);return}
    const b=document.createElement("button");b.className="step";b.type="button";b.dataset.go=r[0];b.innerHTML=`<span class="n">${r[2]}</span>${esc(r[1])}`;
    b.onclick=()=>{if(b.disabled)return;sfx("whoosh");go(r[0])};rail.appendChild(b)});
  $("#rm-snd").onclick=()=>{muted=!muted;try{localStorage.setItem("studysound",muted?"off":"on")}catch(e){}tools();if(!muted)sfx("pop")};
  $("#rm-easy").onclick=()=>{S.prefs.easy=!S.prefs.easy;save();tools();sfx("pop");relayout()};
  $("#rm-sm").onclick=()=>{S.prefs.size=Math.max(15,S.prefs.size-2);save();tools();sfx("tick");relayout()};
  $("#rm-lg").onclick=()=>{S.prefs.size=Math.min(29,S.prefs.size+2);save();tools();sfx("tick");relayout()};
  $("#rm-aloud").onclick=()=>{S.prefs.aloud=!S.prefs.aloud;save();if(!S.prefs.aloud)stopAloud();tools();sfx("pop");if(ui.screen==="read"||ui.screen==="quiz")render()};
  $("#rm-aloud").hidden=!TTS.ok;
  $("#rm-theme").onclick=()=>{S.prefs.theme=S.prefs.theme==="dark"?"light":"dark";save();tools();sfx("pop")};
  addEventListener("keydown",keys);
  let rt=0;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(relayout,120)});
}
function tools(){const p=S.prefs,root=document.documentElement;
  root.classList.toggle("rm-easy",!!p.easy);root.style.setProperty("--rm-size",p.size+"px");
  root.dataset.theme=p.theme==="dark"?"dark":"light";   // the app is always light; "dark" only darkens the reading page
  $("#rm-easy").setAttribute("aria-pressed",p.easy?"true":"false");$("#rm-aloud").setAttribute("aria-pressed",p.aloud?"true":"false");
  $("#rm-size").textContent=p.size+"px";$("#rm-theme").textContent=p.theme==="dark"?"Reading page: dark":"Reading page: light";
  const sb=$("#rm-snd");sb.textContent=muted?"Sound off":"Sound on";sb.setAttribute("aria-pressed",muted?"false":"true");
  status()}
function status(){const lv=levelOf(S.xp),a=levelFloor(lv),b=levelFloor(lv+1),st=streak();
  $("#rm-status").innerHTML=`<span class="rm-pill" title="${S.xp} XP">Level ${lv}<span class="bar"><i style="width:${Math.round((S.xp-a)/(b-a)*100)}%"></i></span></span>`+
  (st?`<span class="rm-pill">${svg('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5.5.8 1.3 1.6 1.8 2.4 2C12 7 12 5 12 3z"/>')}${st}-day streak</span>`:"")+
  (S.band?`<span class="rm-pill">Band ${S.band} · ${S.wpm} wpm</span>`:"")}
function railSync(){const s=ses?ses.step:null,ordr=["warm","read","quiz","done"],reach=s?ordr.indexOf(s):-1;
  $$("#rm-rail .step").forEach(b=>{const g=b.dataset.go,i=ordr.indexOf(g);b.disabled=i>=0&&g!==s&&!(g==="quiz"&&s==="done");b.setAttribute("aria-current",g===ui.screen?"true":"false")})}
function go(scr){stopAloud();cancelAnimationFrame(raf);ui.screen=scr;try{history.replaceState(null,"",scr==="progress"||scr==="glance"?"#"+scr:location.pathname+location.search)}catch(e){}render();
  const st=$("#rm-stage");if(st.getBoundingClientRect().top<0)st.scrollIntoView({behavior:RM_REDUCED?"auto":"smooth",block:"start"})}
function render(){railSync();status();const f={choose:vChoose,warm:vWarm,read:vRead,quiz:vQuiz,done:vDone,progress:vProgress,glance:vGlance}[ui.screen];$("#rm-stage").innerHTML="";f($("#rm-stage"))}
function keys(e){if(e.target.closest&&e.target.closest("input,textarea,select,button"))return;
  if(ui.screen==="read"&&rd){if(e.key===" "){e.preventDefault();rd.toggle()}else if(e.key==="ArrowRight"&&rd.next){rd.next()}else if(e.key==="ArrowLeft"&&rd.back){rd.back()}else if(e.key==="+"||e.key==="="){speed(10)}else if(e.key==="-"){speed(-10)}}
  if(ui.screen==="quiz"&&/^[1-4a-d]$/i.test(e.key)){const i="1234".includes(e.key)?+e.key-1:"abcd".indexOf(e.key.toLowerCase());const b=$$(".rm-opt")[i];if(b&&!b.disabled)b.click()}}

/* ───────────── text rendering ───────────── */
function textHTML(t,title=true){let si=0,out=title?`<h3 class="ttl">${esc(t.title)}</h3>`:"";
  t.paras.forEach((p,pi)=>{const us=t.units.filter(u=>u.pi===pi);out+=`<p class="rm-p${t.poem?" poem":""}" data-p="${pi}"><span class="pn" aria-hidden="true">${pi+1}</span>`+
    us.map(u=>{const k=t.units.indexOf(u);return`<span class="s" data-s="${k}">`+u.words.map((w,j)=>`<span class="w" data-w="${u.w0+j}">${esc(w)}</span>`).join(" ")+`</span>`}).join(t.poem?"<br>":" ")+`</p>`});
  return out}
const chipsFor=t=>`${t.worlds.map(w=>`<span class="rm-chip w">${esc(WN[w])}</span>`).join("")}<span class="rm-chip">Band ${t.band} · ${BANDS[t.band].years}</span><span class="rm-chip">${esc(t.genre)}</span>${t.subject?`<span class="rm-chip">${esc(t.subject)}</span>`:""}<span class="rm-chip">${t.words} words</span>`;

/* ───────────── 1 · choose ───────────── */
const MODEART={guided:'<svg viewBox="0 0 120 40" aria-hidden="true"><g fill="currentColor"><rect x="4" y="4" width="96" height="4" rx="2" opacity=".45"/><rect x="4" y="13" width="108" height="4" rx="2" opacity=".45"/><rect x="1" y="19.5" width="116" height="11" rx="4" fill="var(--rm-gold)" opacity=".35"/><rect x="4" y="23" width="100" height="4" rx="2"/><rect x="4" y="33" width="88" height="4" rx="2" opacity=".08"/></g></svg>',
free:'<svg viewBox="0 0 120 40" aria-hidden="true"><g fill="currentColor"><rect x="4" y="4" width="78" height="4" rx="2"/><rect x="4" y="13" width="72" height="4" rx="2"/><rect x="4" y="22" width="80" height="4" rx="2"/><rect x="4" y="31" width="56" height="4" rx="2"/></g><circle cx="104" cy="22" r="11" fill="none" stroke="currentColor" stroke-width="2"/><path d="M104 15v7l4 3M101 8h6" fill="none" stroke="var(--rm-gold)" stroke-width="2.4" stroke-linecap="round"/></svg>',
focus:'<svg viewBox="0 0 120 40" aria-hidden="true"><ellipse cx="58" cy="20" rx="58" ry="11" fill="var(--rm-gold)" opacity=".28"/><g fill="currentColor"><rect x="4" y="4" width="96" height="4" rx="2" opacity=".14"/><rect x="10" y="18" width="98" height="5" rx="2.5"/><rect x="4" y="32" width="104" height="4" rx="2" opacity=".14"/></g></svg>'};
function vChoose(el){const first=!S.sessions.length,t=ui.pick?TX[ui.pick]:recommend(),ready=S.interests.length&&S.band;
  const cnt=w=>TEXTS.filter(x=>x.worlds.includes(w)).length;
  el.innerHTML=`<p class="rm-lead">${first?"Kia ora. This machine trains reading speed and understanding together. Pick what you like reading about, where to start, and how you want to read.":"Welcome back. Your worlds and level are saved. Change anything you like, then start your next text."}</p>
  <div><h3 class="rm-h">Your worlds <em>Pick as many as you like. Texts come from these first.</em></h3><div class="rm-worlds">${WORLDS.map(([id,n])=>`<button type="button" class="rm-world" data-w="${id}" aria-pressed="${S.interests.includes(id)}">${svg(ICON[id])}${esc(n)}<small>${cnt(id)} text${cnt(id)>1?"s":""}</small></button>`).join("")}</div></div>
  <div class="rm-row"><div><h3 class="rm-h">Where to start</h3><div class="rm-seg">${[1,2,3,4].map(b=>`<button type="button" class="btn" data-b="${b}" aria-pressed="${S.band===b}">${BANDS[b].years}</button>`).join("")}</div>
    <p class="rm-note">${first?"Not sure? Pick your year group. The machine moves you up or down as you read.":`You’re reading at Band ${S.band}, guided pace ${S.wpm} words a minute. It adapts as you go; pick another band only if it feels wrong.`}</p></div>
  <div><h3 class="rm-h">How to read</h3><div class="rm-modes">${Object.entries(MODES).map(([k,[n,d]])=>`<button type="button" class="rm-mode" data-m="${k}" aria-pressed="${S.mode===k}">${MODEART[k]}<b>${n}</b><span>${d}</span></button>`).join("")}</div></div></div>
  <div class="rm-next"><div><div class="rm-h" style="margin:0">${ui.pick?"You picked":"Up next for you"}</div><h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p><div class="rm-chips">${chipsFor(t)}</div></div>
    <button type="button" class="btn go" id="rm-start" ${ready?"":"disabled"}>${ready?"Start warm-up →":S.interests.length?"Pick where to start":"Pick a world first"}</button></div>
  <details class="rm-lib"><summary>Browse the library · ${TEXTS.length} texts</summary><div class="rm-libgrid">${[1,2,3,4].map(b=>`<div class="rm-libband"><h4>Band ${b} · ${BANDS[b].years} · ${BANDS[b].lex}</h4>${TEXTS.filter(x=>x.band===b).map(x=>{const last=[...S.sessions].reverse().find(s=>s.tid===x.id);
    return`<div class="rm-librow"><div><b>${esc(x.title)}</b> <span class="meta">· ${x.worlds.map(w=>esc(WN[w])).join(", ")} · ${esc(x.genre)} · ${x.words} words${last?` · <span class="done">read, ${last.comp}%</span>`:""}</span></div><button type="button" class="btn" data-pick="${x.id}">Choose</button></div>`}).join("")}</div>`).join("")}</div></details>`;
  $$(".rm-world",el).forEach(b=>b.onclick=()=>{const w=b.dataset.w,i=S.interests.indexOf(w);i>=0?S.interests.splice(i,1):S.interests.push(w);save();sfx("pop");if(!ui.pick)rerenderKeepScroll()});
  $$(".rm-seg .btn",el).forEach(b=>b.onclick=()=>{const nb=+b.dataset.b;if(S.band!==nb){S.band=nb;S.wpm=BANDS[nb].wpm;S.hi=S.lo=S.boosts=0;save()}sfx("pop");rerenderKeepScroll()});
  $$(".rm-mode",el).forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();sfx("pop");rerenderKeepScroll()});
  $$("[data-pick]",el).forEach(b=>b.onclick=()=>{ui.pick=b.dataset.pick;sfx("pop");render();$(".rm-next").scrollIntoView({behavior:RM_REDUCED?"auto":"smooth",block:"center"})});
  const sb=$("#rm-start",el);sb.onclick=()=>{if(sb.disabled)return;startSession(t.id)}}
function rerenderKeepScroll(){const y=scrollY;render();scrollTo(0,y)}
function startSession(tid){const t=TX[tid];ui.pick=null;
  const r=rng(hash(tid+S.sessions.length)),v=t.vocab.map((x,i)=>i).sort(()=>r()-.5).slice(0,2);
  ses={tid,mode:S.mode,step:"warm",wpm:S.wpm,secs:0,listened:false,answers:[],qi:0,warm:v,proved:0};sfx("whoosh");go("warm")}

/* ───────────── 2 · warm up ───────────── */
function vWarm(el){const t=TX[ses.tid];const W=20;let el0=0,last=null;
  el.innerHTML=`<div class="rm-warm"><div class="rm-h" style="justify-content:center">Warm up · 20 seconds · two words from “${esc(t.title)}”</div>
  <svg class="rm-ring" viewBox="0 0 64 64" role="timer" aria-label="Warm-up timer"><circle class="bg" cx="32" cy="32" r="27"/><circle class="fg" id="rm-rg" cx="32" cy="32" r="27" stroke-dasharray="169.6" stroke-dashoffset="0"/><text x="32" y="38" text-anchor="middle" id="rm-rt">20</text></svg>
  <div class="rm-cards">${ses.warm.map((i,k)=>{const[w,d,ex]=t.vocab[i];return`<button type="button" class="rm-flash" data-k="${k}" aria-label="Flashcard: ${esc(w)}. Tap to flip."><span class="in"><span class="f"><small>Word ${k+1} · tap to flip</small><b>${esc(w)}</b></span><span class="b"><small>${esc(w)}</small><p>${esc(d)}</p><i>“${esc(ex)}”</i></span></span></button>`}).join("")}</div>
  <p class="rm-note" style="margin:0">Spot these words when you read. Knowing them first makes the whole text easier.</p>
  <div class="rm-btns"><button type="button" class="btn" id="rm-skip">Skip warm-up</button><button type="button" class="btn go" id="rm-ready">I’m ready to read →</button></div></div>`;
  const flip=(c,on)=>{if(!c||c.classList.contains("on")===on)return;c.classList.toggle("on",on);sfx("whoosh")};
  $$(".rm-flash",el).forEach(c=>c.onclick=()=>flip(c,!c.classList.contains("on")));
  const next=()=>{cancelAnimationFrame(raf);ses.step="read";go("read")};
  $("#rm-skip",el).onclick=next;$("#rm-ready",el).onclick=next;
  const cards=$$(".rm-flash",el),flipped=[0,0];
  const loop=ts=>{if(ui.screen!=="warm")return;if(last!=null)el0+=Math.min(.1,(ts-last)/1000)*Math.min(FAST,4);last=ts;
    if(el0>3&&!flipped[0]){flipped[0]=1;flip(cards[0],true)}if(el0>10&&!flipped[1]){flipped[1]=1;flip(cards[1],true)}
    const left=Math.max(0,W-el0);$("#rm-rt").textContent=Math.ceil(left);$("#rm-rg").setAttribute("stroke-dashoffset",(169.6*(1-left/W)).toFixed(1));
    if(left<=0){sfx("tick");next();return}raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop)}

/* ───────────── 3 · read ───────────── */
let rd=null;
function speed(d){if(!ses||ses.mode==="free")return;ses.wpm=clampW(ses.wpm+d);S.wpm=ses.wpm;save();sfx("tick");const v=$("#rm-spd");if(v)v.textContent=ses.wpm+" wpm";status()}
function vRead(el){const t=TX[ses.tid],m=ses.mode;rd=null;aloudStop=null;relayoutFn=null;
  const aloud=S.prefs.aloud&&TTS.ok;
  el.innerHTML=`<div class="rm-meta"><h2>${esc(t.title)}</h2><div class="rm-chips" style="margin:0">${chipsFor(t)}</div></div>
  <div class="rm-bar" role="group" aria-label="Reading controls">
    <button type="button" class="btn primary" id="rm-go">Start</button>
    ${m!=="free"?`<span class="ctlgrp"><button type="button" class="btn" id="rm-slow" aria-label="Slower">−</button><span class="val" id="rm-spd" aria-live="polite">${ses.wpm} wpm</span><button type="button" class="btn" id="rm-fast" aria-label="Faster">+</button></span>`:""}
    ${m==="focus"?`<span class="ctlgrp"><button type="button" class="btn" id="rm-back" aria-label="Previous sentence">‹</button><button type="button" class="btn" id="rm-fwd" aria-label="Next sentence">›</button><button type="button" class="btn tog" id="rm-auto" aria-pressed="true">Auto</button></span>`:""}
    ${aloud?`<button type="button" class="btn tog" id="rm-say" aria-pressed="false">Read it to me</button>`:""}
    <span class="val" id="rm-clock" aria-label="Time reading">0:00</span>
    <span class="rm-prog" aria-hidden="true"><i id="rm-pg"></i></span>
    <span class="rm-chip" style="border:0;padding:0">${esc(MODES[m][0])}</span>
  </div>
  <article class="rm-page mode-${m}${m==="free"?" veil":""}" id="rm-page" aria-label="${esc(t.title)}"><div class="rm-txt">${textHTML(t)}</div>
    <div class="rm-ready" id="rm-rdy"><div class="card"><b>${{guided:"Ready when you are",free:"Read at your own pace",focus:"One sentence at a time"}[m]}</b><p>${{guided:`A soft band will reveal the text one line at a time at <strong>${ses.wpm} words a minute</strong>. Use − and + if it feels too fast or slow.`,free:"The text appears when you press Start. Read it all carefully, then press Finished. Speed matters, but understanding matters more.",focus:`Each sentence lights up in turn, moving on at about ${ses.wpm} words a minute. Turn off Auto to move with ‹ and › yourself.`}[m]}</p><button type="button" class="btn go" id="rm-go2">Start reading</button><span class="rm-small">Space bar starts and pauses.</span></div></div></article>
  <div id="rm-after"></div>`;
  const page=$("#rm-page"),words=$$(".w",page),units=$$(".s",page),total=t.words;let running=false,started=false,finished=false,last=null;
  const clock=$("#rm-clock"),pg=$("#rm-pg"),goBtn=$("#rm-go");
  const setBtn=()=>{goBtn.textContent=finished?"Done":!started?"Start":running?"Pause":"Resume";goBtn.disabled=finished};
  const progress=n=>{pg.style.width=Math.min(100,n/total*100)+"%"};
  // guided state
  let lines=[],li=0,lel=0,band=null,fill=null;
  const box=w=>{const r=w.getBoundingClientRect(),p=page.getBoundingClientRect();return{x:r.left-p.left-page.clientLeft,y:r.top-p.top-page.clientTop,w:r.width,h:r.height}};
  function layout(){if(m!=="guided")return;lines=[];let top=null;for(const w of words){const tp=box(w).y;if(top===null||Math.abs(tp-top)>3){lines.push({top:tp,ws:[]});top=tp}lines[lines.length-1].ws.push(w)}
    lines.forEach((L,i)=>L.ws.forEach(w=>w.dataset.l=i));placeBand(true)}
  function placeBand(instant){if(m!=="guided"||!lines.length)return;if(!band){band=document.createElement("div");band.className="rm-band";band.innerHTML="<i></i>";page.appendChild(band);fill=band.firstChild}
    const L=lines[Math.min(li,lines.length-1)],a=box(L.ws[0]),z=box(L.ws[L.ws.length-1]),h=a.h,lh=parseFloat(getComputedStyle(page).lineHeight)||h*1.7,pad=Math.max(4,(lh-h)/2);
    if(instant)band.style.transition="none";band.style.top=(a.y-pad)+"px";band.style.height=(h+pad*2)+"px";band.style.left=(a.x-12)+"px";band.style.width=(z.x+z.w-a.x+24)+"px";
    if(instant){band.offsetWidth;band.style.transition=""}}
  function paintLines(){words.forEach(w=>{const l=+w.dataset.l;w.classList.toggle("ah",l>li);w.classList.toggle("pa",l<li)})}
  function keepInView(elm){const r=elm.getBoundingClientRect(),vh=innerHeight;if(r.top>vh*.62||r.top<90)scrollBy({top:r.top-vh*.36,behavior:RM_REDUCED?"auto":"smooth"})}
  // focus state
  let si=0,sel=0,auto=true;
  function light(){units.forEach((u,i)=>u.classList.toggle("lit",i===si));keepInView(units[si]);progress(t.units[si].w0)}
  function start(){if(finished)return;if(!started){started=true;$("#rm-rdy").remove();page.classList.remove("veil");sfx("tick");
      if(m==="guided"){words.forEach(w=>w.classList.add("ah"));layout();paintLines()}if(m==="focus")light()}
    running=!running;setBtn();if(running){last=null;raf=requestAnimationFrame(loop)}}
  function finish(){if(finished)return;finished=true;running=false;cancelAnimationFrame(raf);stopAloud();setBtn();progress(total);
    words.forEach(w=>w.classList.remove("ah","pa","spk"));if(band)band.remove();page.classList.add("done");units.forEach(u=>u.classList.remove("lit"));
    ses.secs=Math.max(ses.secs,1);ses.wpmMeasured=Math.round(total/(ses.secs/60));ses.step="quiz";railSync();sfx("page");
    const fastNote=m==="free"&&ses.wpmMeasured>SKIM?" That’s skimming speed, so it won’t count towards your speed record. The questions will show how much stuck.":"";
    $("#rm-after").innerHTML=`<div class="rm-done"><p><b>Page done.</b> ${mmss(ses.secs)} · about <b>${ses.wpmMeasured}</b> words a minute.${fastNote}${ses.listened?" (You listened to read-aloud, so speed won’t be counted.)":""}</p><button type="button" class="btn go" id="rm-toq">On to the questions →</button></div>`;
    $("#rm-toq").onclick=()=>{sfx("whoosh");go("quiz")};$("#rm-after").scrollIntoView({behavior:RM_REDUCED?"auto":"smooth",block:"nearest"})}
  function loop(ts){if(ui.screen!=="read"||!running)return;const dt=last==null?0:Math.min(.1,(ts-last)/1000)*FAST;last=ts;
    if(!speaking){ses.secs+=dt;clock.textContent=mmss(ses.secs);
      if(m==="guided"){const L=lines[li],dur=Math.max(.45,L.ws.length/ses.wpm*60);lel+=dt;fill.style.width=Math.min(100,lel/dur*100)+"%";
        if(lel>=dur){lel=0;li++;if(li>=lines.length){finish();return}paintLines();placeBand();fill.style.width="0";keepInView(lines[li].ws[0])}
        progress(+lines[li].ws[0].dataset.w)}
      else if(m==="focus"){if(auto){sel+=dt;const dur=Math.max(.9,t.units[si].words.length/ses.wpm*60+.25);if(sel>=dur){sel=0;if(si>=units.length-1){finish();return}si++;light()}}}
      else progress(Math.min(total*.95,ses.secs/60*S.wpm))}
    else{ses.secs+=dt;clock.textContent=mmss(ses.secs)}
    raf=requestAnimationFrame(loop)}
  goBtn.onclick=start;$("#rm-go2").onclick=start;
  if(m!=="free"){$("#rm-slow").onclick=()=>speed(-10);$("#rm-fast").onclick=()=>speed(10)}
  if(m==="focus"){const nx=()=>{if(!started){start();return}sel=0;if(si>=units.length-1){finish();return}si++;light();sfx("tick")},bk=()=>{if(!started)return;sel=0;si=Math.max(0,si-1);light();sfx("tick")};
    $("#rm-fwd").onclick=nx;$("#rm-back").onclick=bk;$("#rm-auto").onclick=e=>{auto=!auto;e.currentTarget.setAttribute("aria-pressed",auto)};rd={next:nx,back:bk}}
  if(m==="free"){const f=document.createElement("button");f.type="button";f.className="btn go";f.id="rm-fin";f.textContent="Finished";f.style.marginLeft="auto";$(".rm-bar").insertBefore(f,$("#rm-clock"));f.onclick=()=>{if(started)finish()};f.disabled=true;
    const ob=start;goBtn.onclick=$("#rm-go2").onclick=()=>{ob();f.disabled=false}}
  // read aloud: speech drives the highlight; the clock keeps running but the session won't change speed
  let speaking=false;
  if(aloud){const sb=$("#rm-say");sb.onclick=()=>{if(speaking){stopAloud();return}ses.listened=true;if(!started)start();if(!running)start();speaking=true;sb.setAttribute("aria-pressed","true");sb.textContent="Stop reading";
      const from=m==="focus"?si:m==="guided"?Math.max(0,t.units.findIndex(u=>u.w0+u.words.length>+lines[li].ws[0].dataset.w)):0,chunks=t.units.slice(from).map(u=>u.words.join(" "));
      TTS.chain(chunks,{onChunk:c=>{const k=from+c;if(m==="focus"){si=k;light()}},
        onWord:(c,ci)=>{const u=t.units[from+c];let acc=0,j=0;for(;j<u.words.length;j++){if(acc+u.words[j].length>=ci)break;acc+=u.words[j].length+1}
          const w=words[u.w0+Math.min(j,u.words.length-1)];words.forEach(x=>x.classList.remove("spk"));w.classList.add("spk");progress(+w.dataset.w);
          if(m==="guided"&&+w.dataset.l!==li){li=+w.dataset.l;lel=0;paintLines();placeBand()}keepInView(w)},
        onEnd:()=>{speaking=false;finish()}})};
    aloudStop=()=>{if(!speaking)return;speaking=false;TTS.stop();words.forEach(x=>x.classList.remove("spk"));sb.setAttribute("aria-pressed","false");sb.textContent="Read it to me"}}
  rd=Object.assign(rd||{},{toggle:m==="free"?goBtn.onclick:start});
  if(m==="guided")words.forEach(w=>w.classList.add("ah"));
  relayoutFn=()=>{if(started&&!finished){layout();if(m==="guided")paintLines()}};
  try{document.fonts&&document.fonts.ready.then(()=>{if(started)relayoutFn()})}catch(e){}
  setBtn()}
let relayoutFn=null,aloudStop=null;
function relayout(){if(ui.screen==="read"&&relayoutFn)relayoutFn()}
function stopAloud(){if(aloudStop)aloudStop();else TTS.stop()}

/* ───────────── 4 · questions ───────────── */
function vQuiz(el){aloudStop=null;const t=TX[ses.tid],q=t.qs[ses.qi],o=order(t.id,ses.qi),ans=ses.answers[ses.qi],L="ABCD";
  el.innerHTML=`<div class="rm-meta"><h2>${esc(t.title)}</h2><span class="rm-qn">Look back at the text whenever you like</span></div>
  <div class="rm-quiz"><div class="rm-textwrap shut" id="rm-tw"><button type="button" class="btn rm-showtext" id="rm-st">Show the text</button><article class="rm-page" id="rm-page">${textHTML(t)}</article></div>
  <div class="rm-qcard"><div class="rm-qhead"><span class="rm-skill">${esc(SK[q[0]][0])}</span><span class="rm-qn">Question ${ses.qi+1} of ${t.qs.length}</span>
    <div class="rm-dots" aria-hidden="true">${t.qs.map((x,i)=>`<i class="${ses.answers[i]?ses.answers[i].ok?"ok":"no":i===ses.qi?"cur":""}"></i>`).join("")}</div></div>
    <h3 class="rm-q" id="rm-q">${esc(q[1])}</h3>
    ${S.prefs.aloud&&TTS.ok?`<button type="button" class="btn" id="rm-hear" style="justify-self:start">Hear the question</button>`:""}
    <div class="rm-opts" role="group" aria-labelledby="rm-q">${o.map((k,i)=>`<button type="button" class="rm-opt" data-k="${k}"><b>${L[i]}</b><span>${esc(q[2][k])}</span></button>`).join("")}</div>
    <div id="rm-fb" aria-live="polite"></div></div></div>`;
  const tw=$("#rm-tw");$("#rm-st").onclick=()=>{tw.classList.toggle("shut");$("#rm-st").textContent=tw.classList.contains("shut")?"Show the text":"Hide the text"};
  if($("#rm-hear"))$("#rm-hear").onclick=()=>TTS.chain([q[1],...o.map((k,i)=>`${L[i]}. ${q[2][k]}`)]);
  const ev=()=>q.si>=0?$(`.s[data-s="${q.si}"]`,el):null;
  const prove=()=>{const s=ev();if(!s)return;tw.classList.remove("shut");$("#rm-st").textContent="Hide the text";const pgEl=$("#rm-page",el);
    s.classList.remove("pulse");s.offsetWidth;s.classList.add("pulse");
    if(getComputedStyle(pgEl).overflowY==="auto"){pgEl.scrollTo({top:s.offsetTop-pgEl.clientHeight*.35,behavior:RM_REDUCED?"auto":"smooth"});const r=pgEl.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)pgEl.scrollIntoView({block:"nearest"})}
    else s.scrollIntoView({behavior:RM_REDUCED?"auto":"smooth",block:"center"})};
  const show=a=>{const ok=a.ok;$$(".rm-opt",el).forEach(b=>{b.disabled=true;const k=+b.dataset.k;if(k===0)b.classList.add("right");else if(k===a.k)b.classList.add("wrong");else b.classList.add("fade")});
    const s=ev();if(s)s.classList.add("ev");const u=t.units[q.si]||{pi:0,text:""};
    $("#rm-fb").innerHTML=`<div class="rm-fb ${ok?"":"no"}"><div class="verdict">${ok?svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>')+" Right.":svg('<path d="M12 7v6M12 17h.01"/><circle cx="12" cy="12" r="9"/>')+" Not quite. The answer is “"+esc(q[2][0])+"”."}</div>
      <p>${esc(q[3])}</p><div class="rm-quote"><span>The evidence · paragraph ${u.pi+1}</span>${esc(u.text.length>220?u.text.slice(0,217)+"…":u.text)}</div>
      <div class="rm-fbbtns"><button type="button" class="btn" id="rm-prove">Prove it ¶${u.pi+1}</button><button type="button" class="btn go" id="rm-nextq">${ses.qi<t.qs.length-1?"Next question →":"See my results →"}</button></div></div>`;
    $("#rm-prove").onclick=()=>{S.prove++;ses.proved++;save();sfx("tick");prove()};
    $("#rm-nextq").onclick=()=>{sfx("whoosh");if(ses.step==="done"&&ses.qi>=t.qs.length-1){go("done");return}if(ses.qi<t.qs.length-1){ses.qi++;render();$(".rm-qcard").scrollIntoView({behavior:RM_REDUCED?"auto":"smooth",block:"nearest"})}else finishSession()};
    if(innerWidth>820)prove()};
  $$(".rm-opt",el).forEach(b=>b.onclick=()=>{if(ses.answers[ses.qi])return;const k=+b.dataset.k,a={k,ok:k===0,skill:q[0]};ses.answers[ses.qi]=a;sfx(a.ok?"ding":"buzz");if(a.ok)setTimeout(()=>sfx("chime"),60);show(a);
    $$(".rm-dots i",el)[ses.qi].className=a.ok?"ok":"no"});
  if(ans)show(ans)}

/* ───────────── 5 · results ───────────── */
function finishSession(){const t=TX[ses.tid],correct=ses.answers.filter(a=>a&&a.ok).length,n=t.qs.length,comp=Math.round(correct/n*100),wpm=ses.wpmMeasured||0;
  const skills={};ses.answers.forEach(a=>{if(!a)return;skills[a.skill]=skills[a.skill]||[0,0];skills[a.skill][1]++;if(a.ok)skills[a.skill][0]++});
  const before=new Set(BADGES.filter(b=>b[4]()).map(b=>b[0])),lvBefore=levelOf(S.xp),stBefore=streak(),firstToday=!S.sessions.some(x=>x.d===nzDate());
  const ad=adapt(comp,ses.listened);
  const xp=20+correct*10+(comp>=80?15:0)+(firstToday?10:0);S.xp+=xp;
  S.sessions.push({t:Date.now(),d:nzDate(),tid:t.id,band:t.band,mode:ses.mode,wpm,target:ses.wpm,comp,eff:Math.round(wpm*comp/100),secs:Math.round(ses.secs),skills,listened:ses.listened,skim:ses.mode==="free"&&wpm>SKIM,correct,n});
  const fresh=BADGES.filter(b=>b[4]()&&!before.has(b[0])).map(b=>b[0]);fresh.forEach(id=>S.badges[id]=Date.now());
  save();const alBefore=(()=>{try{return K&&K.allen?K.allen.state().has:null}catch(e){return null}})();logStudy(comp>=80?"pass":"done");
  try{if(allen){allen.react(comp>=60,alBefore||undefined);if(comp<60)setTimeout(()=>allen.speak("Tricky one. I’ve slowed the guide down so you get more thinking time.",4200),30);}}catch(e){}
  ses.result={comp,correct,n,wpm,eff:Math.round(wpm*comp/100),ad,xp,fresh,lvUp:levelOf(S.xp)>lvBefore,firstToday,streak:streak(),stBefore};ses.step="done";go("done")}
function vDone(el){const t=TX[ses.tid],R=ses.result,ad=R.ad;
  const ic={up:'<path d="M12 19V5M6 11l6-6 6 6"/>',bandup:'<path d="M12 19V7M6 13l6-6 6 6M5 4h14"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',banddown:'<path d="M12 5v12M6 11l6 6 6-6M5 20h14"/>',hold:'<path d="M5 12h14"/>',almost:'<path d="M5 12h10M12 7l5 5-5 5"/>',listen:'<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6"/>'}[ad.kind];
  const head={up:"Speeding up",bandup:`Up to Band ${ad.bandTo}`,down:"Easing the pace",banddown:`Back to Band ${ad.bandTo} for now`,hold:"Holding steady",almost:"Nearly there",listen:"Listening session"}[ad.kind];
  const sk=Object.entries(SKO.reduce((o,k)=>{const c=ses.answers.filter(a=>a&&a.skill===k);if(c.length)o[k]=[c.filter(a=>a.ok).length,c.length];return o},{}));
  el.innerHTML=`<div class="rm-meta"><h2>${R.comp>=80?"Great reading.":R.comp>=60?"Good work.":"Good effort. Let’s build on it."}</h2><span class="rm-qn">${esc(t.title)} · ${esc(MODES[ses.mode][0])}</span></div>
  <div class="rm-tiles"><div class="rm-tile"><span>Speed</span><b>${R.wpm}<small>wpm</small></b><em>${ses.listened?"listened, not counted":ses.mode==="free"?(R.wpm>SKIM?"skim speed, not counted":"your own pace"):`guide at ${ses.wpm}`}</em></div>
    <div class="rm-tile"><span>Understanding</span><b>${R.comp}<small>%</small></b><em>${R.correct} of ${R.n} right</em></div>
    <div class="rm-tile hero"><span>Effective rate</span><b>${R.eff}<small>wpm</small></b><em>speed × understanding</em></div>
    <div class="rm-tile" id="rm-xp"><span>Earned</span><b>+${R.xp}<small>XP</small></b><em>${R.lvUp?`Level ${levelOf(S.xp)} unlocked!`:`Level ${levelOf(S.xp)}`}${R.firstToday&&R.streak>1?` · ${R.streak}-day streak`:""}</em></div></div>
  <div class="rm-adapt ${ad.kind}"><div class="ic">${svg(ic)}</div><div><h3>${head}</h3>${ad.lines.map(l=>`<p>${esc(l)}</p>`).join("")}</div></div>
  <div class="rm-two"><div><h3 class="rm-h">Skills in this text</h3>${sk.map(([k,[c,n]])=>`<div class="rm-skrow ${c<n?"weak":""}"><span>${esc(SK[k][0])}</span><span class="tr"><i style="width:${c/n*100}%"></i></span><span class="v">${c}/${n}</span></div>`).join("")}</div>
    <div><h3 class="rm-h">Words to keep</h3><div class="rm-vocab">${t.vocab.map(([w,d])=>`<div><b>${esc(w)}</b>${esc(d)}</div>`).join("")}</div></div></div>
  ${R.fresh.length?`<div><h3 class="rm-h">New badge${R.fresh.length>1?"s":""}</h3><div class="rm-badges">${BADGES.filter(b=>R.fresh.includes(b[0])).map(b=>`<div class="rm-badge new"><span class="m">${b[3]}</span>${esc(b[1])}</div>`).join("")}</div></div>`:""}
  <div class="rm-btns"><button type="button" class="btn go" id="rm-again">Next text →</button><button type="button" class="btn big" id="rm-prog">See my progress</button><button type="button" class="btn big" id="rm-review">Review answers</button></div>`;
  $("#rm-again").onclick=()=>{ses=null;ui.pick=null;sfx("whoosh");go("choose")};$("#rm-prog").onclick=()=>go("progress");$("#rm-review").onclick=()=>{ses.qi=0;go("quiz")};
  setTimeout(()=>{sfx("win");if(window.StudyKit&&StudyKit.burst&&(R.comp>=80||R.fresh.length||R.lvUp))try{StudyKit.burst($("#rm-xp"))}catch(e){}},250)}

/* ───────────── progress ───────────── */
// kupu Māori for reading, each checked in Te Aka Māori Dictionary (ta = word id); see te-reo-notes.md
const RKUPU=[{mi:"pānui",en:"to read",ta:5085},{mi:"tuhinga",en:"text, writing",ta:8648},{mi:"kupu",en:"word",ta:3275},{mi:"kupu matua",en:"keyword",ta:11923},{mi:"whakarāpopoto",en:"to summarise; summary",ta:9800},{mi:"kaituhi",en:"writer, author",ta:2031}];
const rKupu=()=>K&&K.kupuItem?`<details class="card kupu-all rm-noprint"><summary><span class="kh">Kupu Māori for reading</span><span class="kn">${RKUPU.length} terms</span></summary><ul class="kupu-list">${RKUPU.map(K.kupuItem).join("")}</ul><p class="kupu-src">Each term was checked against Te Aka Māori Dictionary. Usage can vary between iwi and schools, so check with your teacher which one your class uses.</p></details>`:"";
function growthChart(){const L=S.sessions.slice(-20),N=L.length;if(!N)return`<div class="rm-empty">Read your first text to start your growth chart.</div>`;
  const W=innerWidth<600?380:640,P={l:40,r:74,t:26},H1=innerWidth<600?150:128,H2=innerWidth<600?110:92,gap=40,IN=innerWidth<600?14:22,x=i=>P.l+IN+(N===1?(W-P.l-P.r-2*IN)/2:i*(W-P.l-P.r-2*IN)/(N-1)),cnt=s=>!s.listened&&!s.skim,ws=L.filter(cnt).map(s=>s.wpm),tg=L.map(s=>s.target);
  const hi=Math.max(100,...ws,...tg)*1.12,lo=Math.max(0,Math.min(...ws.concat(tg))*0.75),y1=v=>P.t+H1-(v-lo)/(hi-lo)*H1,y2b=P.t+H1+gap,y2=v=>y2b+H2-v/100*H2;
  let o=`<svg viewBox="0 0 ${W} ${P.t+H1+gap+H2+26}" role="img" aria-label="Growth chart: reading speed and understanding for your last ${N} texts">`;
  const tk=[lo,(lo+hi)/2,hi].map(v=>Math.round(v/10)*10);tk.forEach(v=>o+=`<line class="grid" x1="${P.l}" x2="${W-P.r}" y1="${y1(v)}" y2="${y1(v)}"/><text class="ax" x="${P.l-6}" y="${y1(v)+3}" text-anchor="end">${v}</text>`);
  o+=`<text class="ax" x="${P.l-30}" y="${P.t-14}">WORDS A MINUTE</text>`;
  o+=`<path d="${L.map((s,i)=>(i?"L":"M")+x(i)+","+y1(s.target)).join(" ")}" fill="none" stroke="var(--as-muted)" stroke-width="1.6" stroke-dasharray="5 4"/>`;
  const pts=L.map((s,i)=>cnt(s)?[x(i),y1(s.wpm)]:null);let d="";pts.forEach((p,i)=>{if(p)d+=(d&&pts[i-1]?"L":"M")+p[0]+","+p[1]});
  o+=`<path d="${d}" fill="none" stroke="var(--earth)" stroke-width="2.2" stroke-linejoin="round"/>`;
  pts.forEach((p,i)=>{if(p)o+=`<circle cx="${p[0]}" cy="${p[1]}" r="${i===N-1?5.5:4}" fill="${i===N-1?"var(--rm-gold)":"var(--earth)"}" stroke="var(--as-card)" stroke-width="2"/>`});
  const lp=pts.filter(Boolean).pop();let ly=lp?lp[1]:null,gy=y1(L[N-1].target);
  if(lp&&Math.abs(ly-gy)<15){const mid=(ly+gy)/2,up=ly<=gy;ly=mid+(up?-7.5:7.5);gy=mid+(up?7.5:-7.5)}
  if(lp)o+=`<text class="lbl" x="${W-P.r+8}" y="${ly+4}">${L.filter(cnt).pop().wpm} you</text>`;
  o+=`<text class="ax" x="${W-P.r+8}" y="${gy+4}">${L[N-1].target} guide</text>`;
  [0,60,80,100].forEach(v=>o+=`<line class="${v===60||v===80?"ref":"grid"}" x1="${P.l}" x2="${W-P.r}" y1="${y2(v)}" y2="${y2(v)}"/><text class="ax" x="${P.l-6}" y="${y2(v)+3}" text-anchor="end">${v}</text>`);
  o+=`<text class="ax" x="${P.l-30}" y="${y2b-12}">UNDERSTANDING %</text><text class="ax" x="${W-P.r+8}" y="${y2(80)+3}">speed up</text><text class="ax" x="${W-P.r+8}" y="${y2(60)+3}">ease off</text>`;
  const bw=Math.max(6,Math.min(24,(W-P.l-P.r-2*IN)/Math.max(N,2)*.42));
  L.forEach((s,i)=>{const h=Math.max(2,s.comp/100*H2);o+=`<path d="M${x(i)-bw/2},${y2b+H2} v${-(h-4)} q0,-4 4,-4 h${bw-8} q4,0 4,4 v${h-4}z" fill="var(--earth)" opacity="${i===N-1?1:.72}"/>`});
  L.forEach((s,i)=>{if(N<=(W<600?7:10)||i%2===0||i===N-1)o+=`<text class="ax" x="${x(i)}" y="${y2b+H2+16}" text-anchor="middle">${S.sessions.length-N+i+1}</text>`});
  o+=`<text class="ax" x="${W-P.r+8}" y="${y2b+H2+16}">text #</text>`;
  L.forEach((s,i)=>o+=`<rect class="hit" data-i="${i}" x="${x(i)-Math.max(12,(W-P.l-P.r)/N/2)}" y="0" width="${Math.max(24,(W-P.l-P.r)/N)}" height="${P.t+H1+gap+H2}" fill="transparent"/>`);
  o+=`<line id="rm-cross" x1="0" x2="0" y1="${P.t}" y2="${y2b+H2}" stroke="var(--as-ink)" stroke-width="1" opacity="0"/></svg>`;
  return`<div class="rm-legend"><span><i style="border-color:var(--earth)"></i>Your speed</span><span><i class="d" style="border-color:var(--as-muted)"></i>Guide pace</span><span><i style="border-color:var(--earth);border-top-width:8px;width:10px"></i>Understanding</span></div>${o}<div class="rm-tip" id="rm-tip"></div>`}
function radar(){const T=skillTotals(),W=300,c=150,R=100,n=SKO.length,ang=i=>-Math.PI/2+i*2*Math.PI/n,pt=(i,r)=>[c+Math.cos(ang(i))*r,c+Math.sin(ang(i))*r];
  let o=`<svg viewBox="-30 0 ${W+60} ${W}" role="img" aria-label="Skills radar">`;[.25,.5,.75,1].forEach(f=>o+=`<polygon points="${SKO.map((k,i)=>pt(i,R*f).join(",")).join(" ")}" fill="none" class="grid"/>`);
  SKO.forEach((k,i)=>{const[x2,y2]=pt(i,R),[lx,ly]=pt(i,R+22);o+=`<line class="grid" x1="${c}" y1="${c}" x2="${x2}" y2="${y2}"/><text class="lbl" x="${lx}" y="${ly+4}" text-anchor="${Math.abs(lx-c)<10?"middle":lx<c?"end":"start"}">${SK[k][1]}</text>`});
  const v=SKO.map(k=>T[k][1]?T[k][0]/T[k][1]:0);o+=`<polygon points="${SKO.map((k,i)=>pt(i,Math.max(.04,v[i])*R).join(",")).join(" ")}" fill="var(--rm-gold)" fill-opacity=".32" stroke="var(--as-ink)" stroke-width="2" stroke-linejoin="round"/>`;
  SKO.forEach((k,i)=>{if(T[k][1]){const[x,y]=pt(i,Math.max(.04,v[i])*R);o+=`<circle cx="${x}" cy="${y}" r="4" fill="var(--as-ink)" stroke="var(--as-card)" stroke-width="1.5"><title>${SK[k][0]}: ${Math.round(v[i]*100)}%</title></circle>`}});
  return o+"</svg>"}
function skillRows(sorted){const T=skillTotals();let ks=SKO.filter(k=>T[k][1]);if(sorted)ks.sort((a,b)=>T[a][0]/T[a][1]-T[b][0]/T[b][1]);const w=weakest();
  return ks.map(k=>{const[c,n]=T[k];return`<div class="rm-skrow ${k===w?"weak":""}"><span>${esc(SK[k][0])}</span><span class="tr"><i style="width:${c/n*100}%"></i></span><span class="v">${Math.round(c/n*100)}% <small>(${n})</small></span></div>`}).join("")||`<p class="rm-small">No answers yet.</p>`}
function weakest(){const T=skillTotals(),ks=SKO.filter(k=>T[k][1]>=2);if(!ks.length)return null;return ks.sort((a,b)=>T[a][0]/T[a][1]-T[b][0]/T[b][1]||T[b][1]-T[a][1])[0]}
function strongest(){const T=skillTotals(),ks=SKO.filter(k=>T[k][1]>=2);if(!ks.length)return null;return ks.sort((a,b)=>T[b][0]/T[b][1]-T[a][0]/T[a][1]||T[b][1]-T[a][1])[0]}
function vProgress(el){const lv=levelOf(S.xp),a=levelFloor(lv),b=levelFloor(lv+1),N=S.sessions.length,mins=Math.round(S.sessions.reduce((s,x)=>s+x.secs,0)/60),best=Math.max(0,...speedSessions().map(x=>x.eff));
  const days=new Set(S.sessions.map(x=>x.d));let cal="";for(let i=27;i>=0;i--){const d=nzDate(Date.now()-i*864e5);cal+=`<i class="${days.has(d)?"on":""} ${i===0?"today":""}" title="${d}"></i>`}
  el.innerHTML=`<div class="rm-meta"><h2>My progress</h2><span class="rm-qn">Saved in this browser only</span></div>
  <div class="rm-level"><div class="top"><b>Level ${lv}</b><span>${S.xp} XP · ${b-S.xp} to level ${lv+1}</span></div><div class="rm-lbar"><i style="width:${(S.xp-a)/(b-a)*100}%"></i></div></div>
  <div class="rm-tiles"><div class="rm-tile"><span>Texts read</span><b>${N}</b></div><div class="rm-tile"><span>Time reading</span><b>${mins}<small>min</small></b></div><div class="rm-tile"><span>Streak</span><b>${streak()}<small>day${streak()===1?"":"s"}</small></b></div><div class="rm-tile hero"><span>Best effective rate</span><b>${best}<small>wpm</small></b></div></div>
  <div><h3 class="rm-h">Growth <em>speed and understanding, text by text</em></h3><div class="rm-chart" id="rm-gc">${growthChart()}</div></div>
  <div class="rm-two"><div><h3 class="rm-h">Skills radar</h3><div class="rm-chart" style="padding:4px">${radar()}</div></div><div><h3 class="rm-h">Skills table</h3>${skillRows(false)}<h3 class="rm-h" style="margin-top:18px">Last four weeks</h3><div class="rm-cal" aria-label="Days you read in the last four weeks">${cal}</div></div></div>
  <div><h3 class="rm-h">Badges · ${Object.keys(S.badges).length} of ${BADGES.length}</h3><div class="rm-badges">${BADGES.map(bd=>`<div class="rm-badge ${S.badges[bd[0]]?"":"off"}" title="${esc(bd[2])}"><span class="m">${bd[3]}</span>${esc(bd[1])}</div>`).join("")}</div></div>
  ${N?`<div><h3 class="rm-h">History</h3><div class="rm-scroll"><table class="rm-table"><thead><tr><th>#</th><th>Text</th><th>Mode</th><th>Speed</th><th>Understood</th><th>Effective</th></tr></thead><tbody>${S.sessions.map((x,i)=>[x,i]).reverse().slice(0,12).map(([x,i])=>`<tr><td class="n">${i+1}</td><td>${esc((TX[x.tid]||{}).title||x.tid)}</td><td>${esc(MODES[x.mode][0])}</td><td class="n">${x.listened?"listened":x.wpm+(x.skim?" skim":"")}</td><td class="n">${x.comp}%</td><td class="n">${x.listened||x.skim?"–":x.eff}</td></tr>`).join("")}</tbody></table></div></div>`:""}
  ${rKupu()}
  <div class="rm-btns rm-noprint"><button type="button" class="btn go" id="rm-p2c">${ses&&ses.step!=="done"?"Back to my text →":"Read a text →"}</button><button type="button" class="btn big" id="rm-p2g">Teacher & parent view</button><button type="button" class="btn big" id="rm-reset" style="margin-left:auto">Reset progress</button></div>`;
  $("#rm-p2c").onclick=()=>go(ses&&ses.step!=="done"?ses.step:"choose");$("#rm-p2g").onclick=()=>go("glance");
  $("#rm-reset").onclick=()=>{if(confirm("Reset all reading progress on this device? This can’t be undone.")){S=clone(DEF);ses=null;save();tools();go("choose")}};
  const gc=$("#rm-gc"),tip=$("#rm-tip"),cr=$("#rm-cross");if(gc&&tip){const L=S.sessions.slice(-20);
    $$(".hit",gc).forEach(h=>{const i=+h.dataset.i,s=L[i];h.onmouseenter=()=>{const r=h.getBoundingClientRect(),g=gc.getBoundingClientRect();tip.innerHTML=`<b>#${S.sessions.length-L.length+i+1} ${esc((TX[s.tid]||{}).title||"")}</b><br>${s.listened?"listened":s.skim?s.wpm+" wpm (skim)":s.wpm+" wpm"} · ${s.comp}% · guide ${s.target}`;tip.style.left=(r.left-g.left+r.width/2)+"px";tip.style.top="28px";tip.style.opacity=1;const cx=h.getAttribute("x")*1+h.getAttribute("width")/2;cr.setAttribute("x1",cx);cr.setAttribute("x2",cx);cr.setAttribute("opacity",.25)};
      h.onmouseleave=()=>{tip.style.opacity=0;cr.setAttribute("opacity",0)}})}}

/* ───────────── teacher & parent glance ───────────── */
function spark(vals,max,min=0){if(vals.length<2)return`<p class="rm-small">Needs two or more texts.</p>`;const W=200,H=46,x=i=>4+i*(W-8)/(vals.length-1),y=v=>H-5-(v-min)/((max-min)||1)*(H-10);
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${vals.map((v,i)=>(i?"L":"M")+x(i)+","+y(v)).join(" ")}" fill="none" stroke="var(--as-ink)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${x(vals.length-1)}" cy="${y(vals[vals.length-1])}" r="3.5" fill="var(--rm-gold)" stroke="var(--as-ink)"/></svg>`}
function summary(){const L=S.sessions,sp=speedSessions(),avg=a=>a.length?Math.round(a.reduce((s,x)=>s+x,0)/a.length):0,k=Math.min(3,Math.floor(sp.length/2)||1);
  const w0=avg(sp.slice(0,k).map(x=>x.wpm)),w1=avg(sp.slice(-k).map(x=>x.wpm)),trend=sp.length>=2&&w0?Math.round((w1-w0)/w0*100):null;
  return{N:L.length,mins:Math.round(L.reduce((s,x)=>s+x.secs,0)/60),comp:avg(L.map(x=>x.comp)),w0,w1,trend,weak:weakest(),strong:strongest(),eff:avg(sp.slice(-3).map(x=>x.eff)),days:new Set(L.map(x=>x.d)).size,first:L[0]?L[0].d:null}}
function vGlance(el){const G=summary(),fmtD=d=>d?new Date(d+"T12:00:00").toLocaleDateString("en-NZ",{day:"numeric",month:"short",year:"numeric"}):"";
  el.innerHTML=`<div class="rm-meta rm-noprint"><h2>Teacher & parent view</h2><span class="rm-qn">One card, made to screenshot or print</span></div>
  <div class="rm-glance" id="rm-card"><div class="gh"><div><div class="rm-h" style="margin:0 0 4px">Reading summary${G.first?` · ${fmtD(G.first)} to ${fmtD(nzDate())}`:""}</div><h3><label class="rm-sr" for="rm-name">Student name</label><input id="rm-name" value="${esc(S.name)}" placeholder="Student name (optional)" autocomplete="off"></h3></div>
    <div class="rm-chips" style="margin:0">${S.band?`<span class="rm-chip w">Band ${S.band} · ${BANDS[S.band].years}</span><span class="rm-chip">Guide ${S.wpm} wpm</span>`:""}</div></div>
  ${G.N?`<div class="rm-gstats"><div><span>Time reading</span><b>${G.mins} min</b><em>over ${G.days} day${G.days===1?"":"s"}</em></div><div><span>Texts completed</span><b>${G.N}</b><em>${new Set(S.sessions.map(x=>x.tid)).size} different</em></div><div><span>Understanding</span><b>${G.comp}%</b><em>average across texts</em></div><div><span>Effective rate</span><b>${G.eff} wpm</b><em>recent, speed × understanding</em></div></div>
  <div class="rm-spark"><div><div class="rm-h" style="margin:0 0 4px">Speed trend ${G.trend!=null?`<em>${G.w0} → ${G.w1} wpm (${G.trend>=0?"+":""}${G.trend}%)</em>`:""}</div>${spark(speedSessions().map(x=>x.wpm),Math.max(...speedSessions().map(x=>x.wpm),100),Math.min(...speedSessions().map(x=>x.wpm),100)*0.8)}</div>
    <div><div class="rm-h" style="margin:0 0 4px">Understanding trend <em>${S.sessions.slice(-5).map(x=>x.comp+"%").join(" · ")}</em></div>${spark(S.sessions.map(x=>x.comp),100,0)}</div></div>
  <div class="rm-two"><div><div class="rm-h">Skills, weakest first</div>${skillRows(true)}</div>
    <div style="display:grid;gap:10px;align-content:start">${G.weak?`<div class="rm-next2"><span class="rm-h" style="margin:0">Practise next</span><b>${esc(SK[G.weak][0])}</b><p>${esc(TIP[G.weak])}</p></div>`:`<p class="rm-small">A practise-next tip appears after a few more answers.</p>`}
    ${G.strong&&G.strong!==G.weak?`<p style="margin:0;font-size:14px;color:var(--as-ink)"><b>Strongest:</b> ${esc(SK[G.strong][0])}</p>`:""}
    <p style="margin:0;font-size:13.5px;color:var(--as-text)"><b style="color:var(--as-ink)">Worlds:</b> ${S.interests.map(w=>esc(WN[w])).join(", ")||"none picked"}<br><b style="color:var(--as-ink)">Modes used:</b> ${[...new Set(S.sessions.map(x=>MODES[x.mode][0]))].join(", ")}</p></div></div>`
  :`<div class="rm-empty">No texts read yet on this device. The summary fills in after the first text.</div>`}
  <p class="rm-small">Speed is words a minute while reading; understanding is the share of questions right first time. Read-aloud sessions aren’t counted for speed. Levels are approximate and texts are original to assembl. Not a standardised assessment.</p></div>
  <div class="rm-btns rm-noprint"><button type="button" class="btn go" id="rm-copy">Copy as text</button><button type="button" class="btn big" id="rm-print">Print</button><button type="button" class="btn big" id="rm-g2p">My progress</button></div>`;
  $("#rm-name").oninput=e=>{S.name=e.target.value.slice(0,60);save()};
  $("#rm-print").onclick=()=>{try{print()}catch(e){}};$("#rm-g2p").onclick=()=>go("progress");
  $("#rm-copy").onclick=()=>{const b=$("#rm-copy"),txt=[`Reading summary${S.name?" – "+S.name:""} (${nzDate()})`,`Texts: ${G.N} · Time: ${G.mins} min · Understanding: ${G.comp}% · Effective rate: ${G.eff} wpm`,
      G.trend!=null?`Speed: ${G.w0} → ${G.w1} wpm (${G.trend>=0?"+":""}${G.trend}%)`:"",S.band?`Current level: Band ${S.band} (${BANDS[S.band].years}), guide pace ${S.wpm} wpm`:"",
      G.weak?`Practise next: ${SK[G.weak][0]}. ${TIP[G.weak]}`:"",G.strong?`Strongest: ${SK[G.strong][0]}`:"","From the reading machine (assembly by assembl). Levels approximate."].filter(Boolean).join("\n");
    const done=()=>{b.textContent="Copied";setTimeout(()=>b.textContent="Copy as text",1600)};try{navigator.clipboard.writeText(txt).then(done,()=>{b.textContent="Couldn’t copy"})}catch(e){b.textContent="Couldn’t copy"}}}

/* ───────────── boot ───────────── */
window.ReadingMachine={texts:TEXTS,state:()=>S,session:()=>ses,
  correctIndex:()=>{if(!ses)return -1;return order(ses.tid,ses.qi).indexOf(0)},
  validate:()=>{const p=[];TEXTS.forEach(t=>{if(t.qs.length<6||t.qs.length>8)p.push(t.id+": "+t.qs.length+" questions");if(t.vocab.length!==4)p.push(t.id+": vocab "+t.vocab.length);
    t.qs.forEach((q,i)=>{if(q.si<0)p.push(t.id+" q"+(i+1)+": evidence not found");if(!SK[q[0]])p.push(t.id+" q"+(i+1)+": bad skill");if(q[2].length!==4)p.push(t.id+" q"+(i+1)+": options")})});return p},
  stats:()=>TEXTS.map(t=>({id:t.id,band:t.band,words:t.words,sentences:t.units.length,genre:t.genre}))};
shell();tools();allenSetup();logStudy("open");
const h0=(location.hash||"").slice(1);go(h0==="progress"||h0==="glance"?h0:"choose");
})();
