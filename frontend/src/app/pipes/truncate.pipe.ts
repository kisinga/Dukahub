import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: any, limit: number = 100): string {
    if (value == undefined) {
      return "";
    }

    return this.optionalTruncate(value, limit);
  }

  optionalTruncate(str: string, maxLength: number = 15): string {
    if (!str) return '';

    // If the string is already shorter than maxLength, return it as is
    if (str.length <= maxLength) return str;

    // Find the first space after the start of the string
    const firstSpaceIndex = str.indexOf(' ');

    // If there's no space (i.e., it's a single word) or the first word is longer than maxLength
    if (firstSpaceIndex === -1 || firstSpaceIndex > maxLength) {
      // Apply normal truncation
      return str.slice(0, maxLength - 3) + '...';
    }

    // If the first word is not longer than maxLength, return it
    if (firstSpaceIndex <= maxLength) {
      return str.slice(0, firstSpaceIndex);
    }

    // Find the last space within maxLength characters
    const lastSpaceIndex = str.lastIndexOf(' ', maxLength - 3);

    // If found, truncate at this space; otherwise, truncate at maxLength
    if (lastSpaceIndex > 0) {
      return str.slice(0, lastSpaceIndex) + '...';
    } else {
      return str.slice(0, maxLength - 3) + '...';
    }
  }
}