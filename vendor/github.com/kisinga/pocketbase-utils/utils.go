package dbUtils

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
)

func structToMap(item interface{}) (map[string]interface{}, error) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Recovered in structToMap", r)
		}
	}()
	val := reflect.ValueOf(item)

	if val.Kind() == reflect.Ptr {
		val = val.Elem() // If it's a pointer, dereference to the value.
	}

	if val.Kind() != reflect.Struct {
		return nil, errors.New("data is not a struct")
	}

	data, err := json.Marshal(item)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	err = json.Unmarshal(data, &result)
	//
	if err != nil {
		return nil, err
	}

	t := val.Type()
	for key := range result {
		for i := 0; i < val.NumField(); i++ {
			field := t.Field(i)
			jsonTagWithOptions := field.Tag.Get("json")
			jsonTag := strings.Split(jsonTagWithOptions, ",")[0]

			if jsonTag == key {
				value := val.Field(i) // Access the field value directly.
				if value.IsValid() && value.Type().String() == "*multipart.FileHeader" {
					result[key] = value.Interface() // No need to assert as pointer here
				}
				break
			}
		}
	}

	return result, nil
}

// getUnderlyingStruct retrieves the underlying struct from a pointer or returns the struct directly if a non-pointer is passed.
func getUnderlyingStruct(value interface{}) (reflect.Value, error) {
	val := reflect.ValueOf(value)

	// Check if the value is a pointer
	if val.Kind() == reflect.Ptr {
		val = val.Elem() // If it's a pointer, dereference to get the underlying value.
	}

	// Now, check if the underlying value (or original value if not a pointer) is a struct
	if val.Kind() != reflect.Struct {
		return reflect.Value{}, errors.New("provided data is neither a struct nor a pointer to a struct")
	}

	return val, nil
}
