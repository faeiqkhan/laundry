package com.faeiq.ClothNCare.product.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.product.dto.ProductDTO;
import com.faeiq.ClothNCare.product.dto.ProductResponseDTO;
import com.faeiq.ClothNCare.product.entity.Product;
import com.faeiq.ClothNCare.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<ProductResponseDTO> getAllProducts() {
        return productRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductResponseDTO createProduct(ProductDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Product name is required");
        }
        if (dto.getPrice() == null || dto.getPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Price cannot be negative");
        }
        Product product = new Product();
        product.setName(dto.getName().trim());
        product.setUnit(dto.getUnit());
        product.setPrice(dto.getPrice() == null ? BigDecimal.ZERO : dto.getPrice());
        product.setActive(dto.isActive());
        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponseDTO updateProduct(String id, ProductDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Product name is required");
        }
        if (dto.getPrice() == null || dto.getPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Price cannot be negative");
        }
        product.setName(dto.getName().trim());
        product.setUnit(dto.getUnit());
        product.setPrice(dto.getPrice());
        product.setActive(dto.isActive());
        return toResponse(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(String id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found");
        }
        productRepository.deleteById(id);
    }

    private ProductResponseDTO toResponse(Product product) {
        return new ProductResponseDTO(product.getId(), product.getName(), product.getUnit(), product.getPrice(), product.isActive());
    }
}
