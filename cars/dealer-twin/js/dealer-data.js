/* Generic variant data for the dealer twin engine: Harbour Lane Motors (demo), the assembl lab's fictional dealer group.
   Everything here is invented for the demonstration. Ranges stand in for franchises; tints are chosen for this model. */
window.DEALER_DATA = {
  name: "Harbour Lane Motors (demo)", brandList: "the group's range list",
  sites: [
    { k: "akl", n: "Auckland", fn: ["Sales", "Service", "Parts"], m: ["City cars", "Family SUVs", "Utes", "Vans", "EVs", "Hybrids"], v: "v", note: "Fictional site." },
    { k: "wko", n: "Waikato", fn: ["Sales", "Service", "Parts"], m: ["City cars", "Family SUVs", "Utes", "Hybrids"], v: "v", note: "Fictional site." },
    { k: "bop", n: "Bay of Plenty", fn: ["Sales", "Service"], m: ["Family SUVs", "EVs", "Hybrids"], v: "v", note: "Fictional site." }],
  osmDate: "",
  footprints: {},
  marques: [
    { k: "city", n: "City cars", cn: 0, share: .2, price: 29000, body: ["hatch", "hatch", "sedan"], tint: "#9C7A80" },
    { k: "suv", n: "Family SUVs", cn: 0, share: .26, price: 46000, body: ["suv"], tint: "#55606C" },
    { k: "ute", n: "Utes", cn: 0, share: .16, price: 58000, body: ["ute"], tint: "#CFC8BC" },
    { k: "van", n: "Vans", cn: 0, share: .06, price: 52000, body: ["van"], tint: "#ECE8E1" },
    { k: "ev", n: "EVs", cn: 0, share: .14, price: 55000, body: ["suv", "sedan", "hatch"], tint: "#62786A" },
    { k: "hybrid", n: "Hybrids", cn: 0, share: .18, price: 42000, body: ["suv", "hatch", "sedan"], tint: "#6E4F62" }],
  evShare: { ev: 1, hybrid: 0 },
  campaigns: [
    { n: "Spring SUV weekend", mk: "suv", ch: "Social media", checks: [1, 1, 1, 1, 1] },
    { n: "Run-out offer, city range", mk: "city", ch: "Trade Me Motors", checks: [1, 1, 0, 1, 1] },
    { n: "EV finance offer", mk: "ev", ch: "Google search", checks: [1, 1, 1, 0, 1] },
    { n: "Ute owners' day", mk: "ute", ch: "Radio, print, outdoor", checks: [0, 1, 1, 1, 0] },
    { n: "Test drive a hybrid", mk: "hybrid", ch: "Social media", checks: [1, 1, 1, 1, 0] },
    { n: "Fleet and business pricing", mk: "van", ch: "Own website", checks: [1, 0, 1, 1, 1] }],
  base: { bays: 16, techs: 14, ros: 56, rate: 165, site: "akl", groupTechs: 38, stock: 360, leads: 32, mktSpend: 86000 },
  sample: { defaultSite: "Auckland", roSites: ["Auckland", "Auckland", "Waikato", "Bay of Plenty"], hcSites: ["Auckland", "Auckland", "Waikato", "Bay of Plenty"], badRowSites: ["Auckland", "Waikato"] }
};
