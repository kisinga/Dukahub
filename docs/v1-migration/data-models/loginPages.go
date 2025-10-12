package models

type LoginUserType int

const (
	AdminDashboard LoginUserType = iota
	Dashboard
)

var pages = map[LoginUserType]string{
	AdminDashboard: "admin",
	Dashboard:      "user",
}

func (p LoginUserType) String() string {
	return pages[p]
}
