import { Module } from "@nestjs/common";
import { CloudinaryProvider } from "./cloudinary.providers";

@Module({
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class CloudinaryModule {}
