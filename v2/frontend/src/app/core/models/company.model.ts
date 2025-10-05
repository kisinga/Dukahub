/**
 * HATEOAS link structure
 */
export interface HateoasLink {
    href: string;
    rel: string;
    method?: string;
}

/**
 * Company entity with HATEOAS links
 */
export interface Company {
    id: string;
    name: string;
    logo?: string;
    _links: {
        self: HateoasLink;
        select?: HateoasLink;
        dashboard?: HateoasLink;
    };
}

/**
 * Company list response with HATEOAS
 */
export interface CompanyListResponse {
    companies: Company[];
    _links: {
        self: HateoasLink;
        first?: HateoasLink;
        next?: HateoasLink;
        prev?: HateoasLink;
    };
}

