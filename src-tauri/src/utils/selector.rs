use scraper::Selector;

pub struct CommonSelectors {
    pub ul: Selector,
    pub li: Selector,
    pub a: Selector,
    pub strong: Selector,
    pub b: Selector,
    pub p: Selector,
}

impl CommonSelectors {
    pub fn new() -> Self {
        Self {
            ul: selector_element("ul"),
            li: selector_element("li"),
            a: selector_element("a"),
            strong: selector_element("strong"),
            b: selector_element("b"),
            p: selector_element("p"),
        }
    }
}

pub fn selector_element(selector: &str) -> Selector {
    Selector::parse(selector).expect("Invalid Selector")
}
