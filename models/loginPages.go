package models

type LoginPages int

const (
	AdminDashboard LoginPages = iota
	Dashboard
)

var pages = map[LoginPages]string{
	AdminDashboard: "/admin/dashboard",
	Dashboard:      "/dashboard",
}

func (p LoginPages) String() string {
	return pages[p]
}
