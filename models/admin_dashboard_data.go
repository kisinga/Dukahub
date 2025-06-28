package models

type CompanyDashboardData struct {
	Company       *Companies
	ProductsCount int
	UsersCount    int
	AccountsCount int
	PartnersCount int
	ModelStatus   ModelStatus
	ModelDetails  ModelDetails
}

type ModelStatus int

const (
	ModelStatusPending ModelStatus = iota
	ModelStatusTraining
	ModelStatusTrained
	ModelStatusError
)

func (ms ModelStatus) String() string {
	switch ms {
	case ModelStatusPending:
		return "pending"
	case ModelStatusTraining:
		return "training"
	case ModelStatusTrained:
		return "trained"
	case ModelStatusError:
		return "error"
	default:
		return "unknown"
	}
}

type ModelDetails struct {
	CompanyName   string
	CompanyId     string
	Status        string
	LastTrainDate string
	NewItems      int
	NewImages     int
	TotalImages   int
}
