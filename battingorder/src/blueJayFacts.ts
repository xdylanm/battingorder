export const BLUE_JAY_FACTS: string[] = [
  "The brilliant blue color of a Blue Jay's feathers isn't actually blue pigment — it's an optical illusion. Tiny air pockets in the feather structure scatter light in a way that makes them appear vivid blue. Crush the feather and the color disappears entirely.",
  "Blue Jays belong to the corvid family, alongside crows, ravens, and magpies — widely considered the most intelligent birds on Earth. They demonstrate complex problem-solving, tool use, and the ability to plan for the future.",
  "Blue Jays are powerful forest gardeners. Each autumn, a single bird can bury thousands of acorns across a wide area to eat later — and the ones it forgets to retrieve often sprout into new oak trees.",
  "The Blue Jay's crest is a mood indicator. It stands tall when the bird is alert or aggressive, lays flat when frightened, and sits somewhere in between when relaxed — a feathered mood ring you can read from across the yard.",
  "Blue Jays can mimic the calls of hawks — particularly the Red-tailed and Red-shouldered Hawk — with remarkable accuracy. They use this trick both to warn other birds of real predators and sometimes to scare competitors away from a food source.",
  "Blue Jays are among the boldest birds in North America. They will mob predators far larger than themselves — owls, hawks, even cats — with groups of jays diving and calling together until the intruder retreats.",
  "A Blue Jay has a stretchy throat pouch called a gular pouch that lets it carry up to five acorns at once — one in its beak, the rest in the pouch. This makes them remarkably efficient food couriers during autumn caching runs.",
  "Blue Jays form monogamous pairs that often mate for life. Both parents build the nest, and males are unusually attentive — frequently bringing food to the female while she incubates the eggs.",
  "Blue Jay plumage is identical between males and females — there's no visible difference whatsoever. The only way to sex a Blue Jay in the field is through behavior, or in a lab through DNA.",
  "The scientific name Cyanocitta cristata means \"blue chattering bird with a crest\" — a description so accurate it barely needed a scientist to coin it. The species is native to North America and found from southern Canada to the Gulf Coast.",
  "Blue Jays have an exceptional spatial memory and can recall the locations of hundreds of individual food caches hidden across their territory. They've been observed returning to a specific cache months after hiding it.",
  "Blue Jays are intelligent enough to recognize individual human faces and remember who has threatened them. Research with corvids shows they hold grudges — and pass that knowledge on to their flock.",
  "Courtship in Blue Jays begins in early spring with a \"courtship flight\" — a group of males following a single female from branch to branch. The female eventually chooses a partner, and the two begin building a nest together.",
  "Young Blue Jays stay close to their parents for one to two months after leaving the nest, during which time they learn foraging techniques, predator avoidance, and the finer points of Blue Jay social behavior.",
  "Blue Jays are scatter-hoarders — they hide food in dozens of different locations rather than one big cache. This strategy hedges against theft: if a squirrel finds one hiding spot, they don't lose everything.",
  "Blue Jays are accomplished vocal mimics beyond just hawk calls. They can imitate other birds, creaking gate hinges, and even some human sounds. Their vocal range is one of the widest of any North American bird.",
  "The Blue Jay's nest is a sturdy cup of twigs, bark strips, moss, and leaves — often reinforced with mud on the interior. It takes roughly a week to build, though a pair may construct several test nests before committing to one.",
  "Blue Jays are one of the few birds that migrate during the day in visible flocks. However, migration is inconsistent — some individuals migrate every year, others never leave their territory, and scientists still don't fully understand what drives the difference.",
  "Blue Jays are highly vocal, producing a wide range of calls with specific meanings. A soft \"jeer\" keeps the flock in contact; rapid \"jay-jay-jay\" signals alarm; and a melodic bell-like call appears to be used during relaxed foraging.",
  "The Blue Jay is the provincial bird of Prince Edward Island, adopted as a provincial symbol in 1977. It was recognized for its striking appearance, its resilience through Maritime winters, and its year-round presence on the island.",
  "Blue Jays have been recorded caching acorns at remarkable rates — one study observed a single bird making 54 round trips in a single day to collect and bury acorns before winter arrived.",
  "Blue Jays practice a behavior called \"anting\" — rubbing ants (live or dead) through their feathers. The formic acid released by the ants is thought to help control feather parasites, though the full purpose is still studied.",
  "Several North American sports teams — most famously the Toronto Blue Jays — chose the Blue Jay as their symbol for its boldness, intelligence, and fierce territorial nature. The bird's reputation for never backing down from a fight made it an ideal mascot.",
  "Blue Jay eggs are typically olive or buff-colored with brown spots, and a pair usually lays 2 to 7 eggs per clutch. Both parents share incubation duties — a relatively rare trait among songbirds.",
  "Blue Jays have expanded their range westward over the past few decades, following the spread of suburbs and backyard bird feeders. Their adaptability to human-altered landscapes has made them one of the most successful birds in North America.",
  "A wild Blue Jay typically lives around 7 years, but some individuals have been tracked to 17 years and beyond. The oldest known wild Blue Jay lived to be 17 years and 6 months — confirmed through banding records.",
  "Blue Jays will steal cached food from other animals — including squirrels — by watching where the squirrel hides its stash and returning later. This requires patience, memory, and awareness of another animal's perspective.",
  "Blue Jay fledglings leave the nest before they can fully fly, spending a few days hopping on the ground or low branches as their flight feathers finish growing. Their parents continue feeding and guarding them through this vulnerable period.",
  "Blue Jays bathe frequently and with great enthusiasm — splashing vigorously in birdbaths or shallow streams. Regular bathing helps maintain feather condition, which is critical for insulation and flight performance.",
  "Blue Jays are extraordinarily adaptable, thriving in dense forests, open woodlands, suburban parks, and city neighbourhoods alike. Their success comes from intelligence, social cooperation, and a willingness to eat almost anything — a combination few birds can match.",
];

export function hashGameId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}
