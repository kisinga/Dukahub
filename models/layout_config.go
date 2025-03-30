package models

import "github.com/a-h/templ"

type LayoutConfig struct {
	Title string
	JS    templ.Component
	CSS   templ.Component
}
